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
  public cloudfrontCertificateArn: string;
  public static readonly env = getEnv("ENVIRONMENT");

  constructor(scope: Construct) {
    super(scope, "config");
    const env = Config.env;
    this.appBucketName = `hassu-app-${env}`;
    this.dmzProxyEndpoint = this.getParameter(`/${env}/DMZProxyEndpoint`);
    this.cloudfrontCertificateArn = this.getParameter(`/${env}/CloudfrontCertificateArn`);
    this.frontendDomainName = this.getParameter(`/${env}/FrontendDomainName`);
  }

  private getParameter(parameterName: string) {
    return ssm.StringParameter.valueForStringParameter(this, parameterName);
  }

  currentBranch = async () => execShellCommand("git rev-parse --abbrev-ref HEAD");
}
