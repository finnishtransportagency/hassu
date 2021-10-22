import { ExecException } from "child_process";
import { Construct } from "constructs";
import * as ssm from "@aws-cdk/aws-ssm";
import { Resource } from "@aws-cdk/core";
import { SSM } from "aws-sdk";

const ssmProvider = new SSM({ apiVersion: "2014-11-06" });

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
  public readonly appBucketName: string;
  public readonly dmzProxyEndpoint: string;
  public readonly frontendDomainName: string;
  public readonly cloudfrontCertificateArn?: string;
  public static readonly env = getEnv("ENVIRONMENT");
  public static readonly projektiTableName = "Projekti-" + getEnv("ENVIRONMENT");
  public readonly basicAuthenticationUsername: string;
  public readonly basicAuthenticationPassword: string;
  public readonly infraEnvironment: string;
  private branch?: string;
  public static readonly tags = { Environment: Config.env, Project: "Hassu" };

  private constructor(scope: Construct) {
    super(scope, "config");
    const env = Config.env;
    this.appBucketName = `hassu-app-${env}`;
    if (Config.isPermanentEnvironment()) {
      this.cloudfrontCertificateArn = this.getParameter(`/${env}/CloudfrontCertificateArn`);
    }
    this.infraEnvironment = Config.isPermanentEnvironment() ? env : "dev";
    this.dmzProxyEndpoint = this.getInfraParameter("DMZProxyEndpoint");
    this.frontendDomainName = this.getInfraParameter("FrontendDomainName");
    this.basicAuthenticationUsername = this.getInfraParameter("basicAuthenticationUsername");
    this.basicAuthenticationPassword = this.getInfraParameter("basicAuthenticationPassword");
  }

  public static async instance(scope: Construct) {
    const config = new Config(scope);
    await config.init();
    return config;
  }

  private getParameter(parameterName: string) {
    return ssm.StringParameter.valueForStringParameter(this, parameterName);
  }

  public getInfraParameter(parameterName: string) {
    return ssm.StringParameter.valueForStringParameter(this, this.getInfraParameterPath(parameterName));
  }

  public getInfraParameterPath(parameterName: string) {
    return `/${this.infraEnvironment}/` + parameterName;
  }

  public async getSecureInfraParameter(parameterName: string, isSecureString?: boolean) {
    // Skip AWS API calls if running locally with localstack and cdklocal
    if (Config.env === "localstack") {
      return "dummy";
    }
    const name = `/${this.infraEnvironment}/` + parameterName;
    const params = {
      Name: name,
      WithDecryption: true,
    };
    const value = (await ssmProvider.getParameter(params).promise()).Parameter?.Value;
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
    return ["dev", "prod"].indexOf(Config.env) >= 0;
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
    return this.getBranch() === "main";
  }

  public isDeveloperEnvironment() {
    return !Config.isPermanentEnvironment() && "feature" !== Config.env;
  }
}
