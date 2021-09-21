import { ExecException } from "child_process";
import { Construct } from "constructs";
import * as ssm from "@aws-cdk/aws-ssm";
import { Resource } from "@aws-cdk/core";

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
  public readonly basicAuthenticationUsername: string;
  public readonly basicAuthenticationPassword: string;
  private infraEnvironment: string;

  constructor(scope: Construct) {
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

  private getParameter(parameterName: string) {
    return ssm.StringParameter.valueForStringParameter(this, parameterName);
  }

  public getInfraParameter(parameterName: string) {
    return ssm.StringParameter.valueForStringParameter(this, "/${infraEnvironment}/" + parameterName);
  }

  currentBranch = async () => execShellCommand("git rev-parse --abbrev-ref HEAD");

  public static isPermanentEnvironment(): boolean {
    return ["dev", "prod"].indexOf(Config.env) >= 0;
  }

  public static isFeatureBranch(branch: string): boolean {
    return branch !== "main";
  }
}
