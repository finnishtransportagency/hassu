import * as ssm from "aws-cdk-lib/aws-ssm";
import { SSM } from "@aws-sdk/client-ssm";
import log from "loglevel";
import { BaseConfig } from "../../common/BaseConfig";
import { readFrontendStackOutputs } from "./setupEnvironment";
import { Construct } from "constructs";
import assert from "assert";

const ssmProvider = new SSM({ apiVersion: "2014-11-06", region: "eu-west-1" });
const globalSsmProvider = new SSM({ apiVersion: "2014-11-06", region: "us-east-1" });

type Env = {
  terminationProtection?: boolean;
  isProd: boolean;
  isDevAccount: boolean;
  isDeveloperEnvironment?: boolean;
  waf?: boolean;
  pointInTimeRecovery?: boolean;
};

export enum EnvName {
  "dev" = "dev",
  "test" = "test",
  "training" = "training",
  "prod" = "prod",
  "localstack" = "localstack",
  "feature" = "feature",
  "developer" = "developer",
}

export enum SSMParameterName {
  "HassuAlarmsSNSArn" = "/outputs/HassuAlarmsSNSArn",
}

const envConfigs: Record<EnvName, Env> = {
  dev: {
    terminationProtection: true,
    isDevAccount: true,
    isProd: false,
    waf: true,
    pointInTimeRecovery: false,
  },
  test: {
    terminationProtection: true,
    isDevAccount: true,
    isProd: false,
    waf: true,
    pointInTimeRecovery: false,
  },
  training: {
    terminationProtection: true,
    isDevAccount: true,
    isProd: false,
    waf: true,
    pointInTimeRecovery: true,
  },
  prod: {
    terminationProtection: true,
    isProd: true,
    isDevAccount: false,
    waf: true,
    pointInTimeRecovery: true,
  },
  localstack: {
    isDevAccount: false,
    isProd: false,
  },
  feature: {
    isDevAccount: false,
    isProd: false,
  },
  developer: {
    isDevAccount: true,
    isProd: false,
    isDeveloperEnvironment: true,
  },
};

export class Config extends BaseConfig {
  public static readonly uploadBucketName = `hassu-${BaseConfig.env}-upload`;
  public static readonly yllapitoBucketName = `hassu-${Config.env}-yllapito`;
  public static readonly publicBucketName = `hassu-${Config.env}-public`;
  public static readonly reportBucketName = `hassu-reports`;
  public readonly dmzProxyEndpoint: string;

  /*
   * Osoite, josta sivusto näkyy. Tuotannossa ilman www-alkua.
   */
  public frontendDomainName: string;
  /*
  Osoite, jonka kautta API näkyy. Tuotannossa www-alkuinen osoite. Muualla sama kuin frontendDomainName.
   */
  public frontendApiDomainName: string;

  public readonly cloudfrontCertificateArn?: string;
  public static readonly feedbackTableName = `Palaute-${Config.env}`;
  public static readonly projektiArchiveTableName = `Projekti-arkisto-${Config.env}`;

  // TODO: Vanha KiinteistonomistajaTable, poista kun ei viittauksia
  public static readonly omistajaTableName = `Omistaja-${Config.env}`;
  public static readonly muistuttajaTableName = `Muistuttaja-${Config.env}`;

  public static readonly kiinteistonomistajaTableName = `Kiinteistonomistaja-${Config.env}`;
  public static readonly projektiMuistuttajaTableName = `ProjektiMuistuttaja-${Config.env}`;
  public static readonly tiedoteTableName = `Tiedote-${Config.env}`;
  public static nahtavillaoloVaiheJulkaisuTableName = `NahtavillaoloVaiheJulkaisu-${Config.env}`;
  public readonly velhoEnv;
  public readonly basicAuthenticationUsername: string;
  public readonly basicAuthenticationPassword: string;
  public static readonly tags: Record<string, string> = { Environment: Config.env, Project: "Hassu" };
  public static tagsArray = Object.keys(Config.tags).map((key) => ({ key, value: Config.tags[key] }));

  private readonly scope: Construct;
  public static readonly isHotswap = process.env.HASSU_HOTSWAP == "true";
  public static buildImageRepositoryName = "hassu-build-image";
  public static asianhallintaLambdaName = "hassu-asianhallinta-" + Config.env;
  public static nextjsImageRepositoryName = "hassu-nextjs";

  private constructor(scope: Construct) {
    super();

    this.scope = scope;
    const env = Config.env;
    if (Config.isPermanentEnvironment()) {
      this.cloudfrontCertificateArn = this.getParameter(`/${env}/CloudfrontCertificateArn`);
    }
    this.dmzProxyEndpoint = this.getInfraParameter("DMZProxyEndpoint");
    this.basicAuthenticationUsername = this.getInfraParameter("basicAuthenticationUsername");
    this.basicAuthenticationPassword = this.getInfraParameter("basicAuthenticationPassword");

    // For temporary switch to production Velho
    this.velhoEnv = process.env.VELHO_ENVIRONMENT || BaseConfig.infraEnvironment;
  }

  public static async instance(scope: Construct) {
    const config = new Config(scope);
    await config.init();
    return config;
  }

  public getParameter(parameterName: string): string {
    if (Config.isLocalStack()) {
      return "";
    }
    return ssm.StringParameter.valueForStringParameter(this.scope, parameterName);
  }

  public async getParameterNow(parameterName: string) {
    if (Config.isLocalStack()) {
      return "";
    }
    return Config.getParameterFromSSMNow(ssmProvider, parameterName);
  }

  public getInfraParameter(parameterName: string, infraEnvironment?: string) {
    if (Config.isLocalStack()) {
      return "";
    }
    return ssm.StringParameter.valueForStringParameter(this.scope, this.getInfraParameterPath(parameterName, infraEnvironment));
  }

  public getInfraParameterPath(parameterName: string, infraEnvironment?: string) {
    return `/${infraEnvironment || BaseConfig.infraEnvironment}/` + parameterName;
  }

  public async getSecureInfraParameter(parameterName: string, infraEnvironment: string = BaseConfig.infraEnvironment) {
    return Config.getSecureInfraParameterInternal({ parameterName, infraEnvironment, ssm: ssmProvider });
  }

  public async getGlobalSecureInfraParameter(parameterName: string, infraEnvironment: string = BaseConfig.infraEnvironment) {
    return Config.getSecureInfraParameterInternal({ parameterName, infraEnvironment, ssm: globalSsmProvider });
  }

  private static async getSecureInfraParameterInternal(params: { parameterName: string; infraEnvironment: string; ssm: SSM }) {
    const regionalSsm = params.ssm;
    // Skip AWS API calls if running locally with localstack and cdklocal
    if (Config.isLocalStack()) {
      return "dummy";
    }
    const name = params.infraEnvironment ? `/${params.infraEnvironment}/` + params.parameterName : `/${params.parameterName}`;
    return this.getParameterFromSSMNow(regionalSsm, name);
  }

  private static async getParameterFromSSMNow(regionalSsm: SSM, name: string): Promise<string> {
    let value: string | undefined;
    try {
      value = (
        await regionalSsm.getParameter({
          Name: name,
          WithDecryption: true,
        })
      ).Parameter?.Value;
    } catch (e) {
      log.error(e);
      throw new Error("Parameter " + name + " not found");
    }
    if (!value) {
      throw new Error("Parameter " + name + " not found");
    }
    return value;
  }

  private init = async () => {
    if (Config.isLocalStack()) {
      this.frontendDomainName = "localstack";
      this.frontendApiDomainName = "localstack";
    } else {
      if (Config.isDeveloperEnvironment()) {
        const name = (await readFrontendStackOutputs()).CloudfrontPrivateDNSName || "please-re-run-backend-deployment";
        this.frontendDomainName = name;
        this.frontendApiDomainName = name;
      } else {
        const frontendDomainName = await this.getSecureInfraParameter("FrontendDomainName");
        if (!frontendDomainName) {
          throw new Error("/" + Config.env + "/FrontendDomainName SSM Parameter not found! Maybe logged in to wrong account?");
        }
        const frontendApiDomainName = await this.getSecureInfraParameter("FrontendApiDomainName");
        if (!frontendApiDomainName) {
          throw new Error("/" + Config.env + "/FrontendApiDomainName SSM Parameter not found! Maybe logged in to wrong account?");
        }
        // Yhteensopivuuden vuoksi käytetään listan ensimmäistä. Asennuksen jälkeen voi listan toisen elementin poistaa
        this.frontendDomainName = frontendDomainName.split(",").map((name) => name.trim())[0];
        this.frontendApiDomainName = frontendApiDomainName;
      }
      log.info("frontendDomainName: {}, frontendApiDomainName: {}", this.frontendDomainName, this.frontendApiDomainName);
      assert(this.frontendDomainName, "frontendDomainName pitää olla olemassa");
      assert(this.frontendApiDomainName, "frontendApiDomainName pitää olla olemassa");
    }
  };

  public static isDeveloperEnvironment(): boolean {
    return Config.getEnvConfig().isDeveloperEnvironment || false;
  }

  public static isLocalStack(): boolean {
    return Config.env == "localstack";
  }

  public static isNotLocalStack(): boolean {
    return Config.env !== "localstack";
  }

  public static isDevAccount(): boolean {
    return Config.getEnvConfig().isDevAccount || false;
  }

  public static isProdAccount(): boolean {
    return Config.getEnvConfig().isProd || false;
  }

  public static getEnvConfig(env = BaseConfig.env): Env {
    const envConfig = envConfigs[Config.getEnvConfigName(env)];
    if (envConfig) {
      return envConfig;
    }
    return envConfigs.developer;
  }

  public static getEnvConfigName(env = BaseConfig.env): EnvName {
    const envName = env as unknown as EnvName;
    if (envConfigs[envName]) {
      return envName;
    }
    return EnvName.developer;
  }

  getDomainNames() {
    const domainNames = [this.frontendDomainName];
    if (this.frontendApiDomainName !== this.frontendDomainName) {
      domainNames.push(this.frontendApiDomainName);
    }
    return domainNames;
  }
}
