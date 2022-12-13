import { ExecException } from "child_process";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { SSM } from "aws-sdk";
import log from "loglevel";
import { BaseConfig } from "../../common/BaseConfig";
import { readFrontendStackOutputs } from "./setupEnvironment";
import { Construct } from "constructs";

const ssmProvider = new SSM({ apiVersion: "2014-11-06", region: "eu-west-1" });
const globalSsmProvider = new SSM({ apiVersion: "2014-11-06", region: "us-east-1" });

function execShellCommand(cmd: string): Promise<string> {
  const exec = require("child_process").exec;
  return new Promise((resolve) => {
    exec(cmd, (error: ExecException | null, stdout: string, stderr: string) => {
      if (error) {
        // tslint:disable-next-line:no-console
        console.warn(error);
      }
      resolve(stdout ? stdout.trim() : stderr);
    });
  });
}

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(name + "-ympäristömuuttujaa ei ole asetettu");
  }
  return value;
}

export class Config extends BaseConfig {
  public static readonly uploadBucketName = `hassu-${BaseConfig.env}-upload`;
  public static readonly yllapitoBucketName = `hassu-${Config.env}-yllapito`;
  public static readonly publicBucketName = `hassu-${Config.env}-public`;
  public static readonly archiveBucketName = `hassu-${Config.env}-archive`;
  public static readonly reportBucketName = `hassu-reports`;
  public readonly dmzProxyEndpoint: string;
  public frontendDomainName: string;
  public readonly cloudfrontCertificateArn?: string;
  public static readonly feedbackTableName = "Palaute-" + getEnv("ENVIRONMENT");
  public static readonly projektiArchiveTableName = "Projekti-arkisto-" + getEnv("ENVIRONMENT");
  public readonly velhoEnv;
  public readonly basicAuthenticationUsername: string;
  public readonly basicAuthenticationPassword: string;
  private branch?: string;
  public static readonly tags = { Environment: Config.env, Project: "Hassu" };
  private readonly scope: Construct;
  public static readonly isHotswap = process.env.HASSU_HOTSWAP == "true";
  public static buildImageRepositoryName = "hassu-build-image";

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

  private getParameter(parameterName: string) {
    if (BaseConfig.env === "localstack") {
      return "";
    }
    return ssm.StringParameter.valueForStringParameter(this.scope, parameterName);
  }

  public getInfraParameter(parameterName: string, infraEnvironment?: string) {
    if (Config.env === "localstack") {
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
    // Skip AWS API calls if running locally with localstack and cdklocal
    if (Config.env === "localstack") {
      return "dummy";
    }
    const name = `/${params.infraEnvironment}/` + params.parameterName;
    let value: string | undefined;
    try {
      value = (
        await params.ssm
          .getParameter({
            Name: name,
            WithDecryption: true,
          })
          .promise()
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
    this.branch = process.env.BUILD_BRANCH ? process.env.BUILD_BRANCH : await execShellCommand("git rev-parse --abbrev-ref HEAD");

    if ("localstack" !== Config.env) {
      if (Config.isDeveloperEnvironment()) {
        this.frontendDomainName = (await readFrontendStackOutputs()).CloudfrontPrivateDNSName || "please-re-run-backend-deployment";
      } else {
        this.frontendDomainName = await this.getSecureInfraParameter("FrontendDomainName");
        if (!this.frontendDomainName) {
          throw new Error("/" + Config.env + "/FrontendDomainName SSM Parameter not found! Maybe logged in to wrong account?");
        }
      }
      log.info("frontendDomainName", this.frontendDomainName);
    }
  };

  public isFeatureBranch(): boolean {
    return this.getBranch().startsWith("feature");
  }

  public getBranch() {
    if (!this.branch) {
      throw new Error("branch is not set.");
    }
    return this.branch;
  }

  public static isDeveloperEnvironment() {
    return !Config.isPermanentEnvironment() && "feature" !== Config.env;
  }

  public static isDevAccount() {
    return Config.isPermanentEnvironment() && BaseConfig.env !== "prod";
  }

  public static isProdAccount() {
    return BaseConfig.env == "prod";
  }
}
