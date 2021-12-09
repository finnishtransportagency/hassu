import { ExecException } from "child_process";
import { Construct } from "constructs";
import * as ssm from "@aws-cdk/aws-ssm";
import { Resource } from "@aws-cdk/core";
import { SSM } from "aws-sdk";
import log from "loglevel";

const ssmProvider = new SSM({ apiVersion: "2014-11-06" });
const globalSsmProvider = new SSM({ apiVersion: "2014-11-06", region: "us-east-1" });

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(name + "-ympäristömuuttujaa ei ole asetettu");
  }
  return value;
}

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

export class Config extends Resource {
  public static readonly env = getEnv("ENVIRONMENT");
  public static readonly uploadBucketName = `hassu-${Config.env}-upload`;
  public static readonly yllapitoBucketName = `hassu-${Config.env}-yllapito`;
  public readonly dmzProxyEndpoint: string;
  public readonly frontendDomainName: string;
  public readonly cloudfrontCertificateArn?: string;
  public static readonly projektiTableName = "Projekti-" + getEnv("ENVIRONMENT");
  public readonly velhoEnv;
  public readonly basicAuthenticationUsername: string;
  public readonly basicAuthenticationPassword: string;
  public readonly infraEnvironment: string;
  public static readonly searchIndex: string = "projekti";
  private branch?: string;
  public static readonly tags = { Environment: Config.env, Project: "Hassu" };

  private constructor(scope: Construct) {
    super(scope, "config");
    const env = Config.env;
    if (Config.isPermanentEnvironment()) {
      this.cloudfrontCertificateArn = this.getParameter(`/${env}/CloudfrontCertificateArn`);
    }
    this.infraEnvironment = Config.isPermanentEnvironment() ? env : "dev";
    this.dmzProxyEndpoint = this.getInfraParameter("DMZProxyEndpoint");
    this.frontendDomainName = Config.isPermanentEnvironment()
      ? this.getInfraParameter("FrontendDomainName")
      : process.env.FRONTEND_DOMAIN_NAME || ""; // To make it possible to use developer's own cloudfront for files
    this.basicAuthenticationUsername = this.getInfraParameter("basicAuthenticationUsername");
    this.basicAuthenticationPassword = this.getInfraParameter("basicAuthenticationPassword");

    // For temporary switch to production Velho
    this.velhoEnv = process.env.VELHO_ENVIRONMENT || this.infraEnvironment;
  }

  public static async instance(scope: Construct) {
    const config = new Config(scope);
    await config.init();
    return config;
  }

  private getParameter(parameterName: string) {
    if (Config.env === "localstack") {
      return "";
    }
    return ssm.StringParameter.valueForStringParameter(this, parameterName);
  }

  public getInfraParameter(parameterName: string, infraEnvironment?: string) {
    if (Config.env === "localstack") {
      return "";
    }
    return ssm.StringParameter.valueForStringParameter(
      this,
      this.getInfraParameterPath(parameterName, infraEnvironment)
    );
  }

  public getInfraParameterPath(parameterName: string, infraEnvironment?: string) {
    return `/${infraEnvironment || this.infraEnvironment}/` + parameterName;
  }

  public async getSecureInfraParameter(parameterName: string, infraEnvironment: string = this.infraEnvironment) {
    return this.getSecureInfraParameterInternal({ parameterName, infraEnvironment, ssm: ssmProvider });
  }

  public async getGlobalSecureInfraParameter(parameterName: string, infraEnvironment: string = this.infraEnvironment) {
    return this.getSecureInfraParameterInternal({ parameterName, infraEnvironment, ssm: globalSsmProvider });
  }

  private async getSecureInfraParameterInternal(params: { parameterName: string; infraEnvironment: string; ssm: SSM }) {
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
    this.branch = process.env.BUILD_BRANCH
      ? process.env.BUILD_BRANCH
      : await execShellCommand("git rev-parse --abbrev-ref HEAD");
  };

  public static isPermanentEnvironment(): boolean {
    return ["dev", "test", "prod"].indexOf(Config.env) >= 0;
  }

  public isFeatureBranch(): boolean {
    return this.getBranch().startsWith("feature");
  }

  public getBranch() {
    if (!this.branch) {
      throw new Error("branch is not set.");
    }
    return this.branch;
  }

  public isPermanentBranch(): boolean {
    return ["main", "test"].includes(this.getBranch());
  }

  public isDeveloperEnvironment() {
    return !Config.isPermanentEnvironment() && "feature" !== Config.env;
  }
}
