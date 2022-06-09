/* tslint:disable:no-console */
// This script examines stack outputs and parameter store parameters, and writes .env.local and .env.test files

import {
  CloudFormationClient,
  DescribeStacksCommand,
  DescribeStacksCommandOutput,
} from "@aws-sdk/client-cloudformation";
import { GetParametersByPathCommand, GetParametersByPathCommandOutput, SSMClient } from "@aws-sdk/client-ssm";
import { BaseConfig } from "../../common/BaseConfig";
import * as fs from "fs";
import { BackendStackOutputs } from "../lib/hassu-backend";
import { DatabaseStackOutputs } from "../lib/hassu-database";
import { FrontendStackOutputs } from "../lib/hassu-frontend";
import { Config } from "../lib/config";
import { PipelineStackOutputs } from "../lib/hassu-pipeline";
import { AccountStackOutputs } from "../lib/hassu-account";

const usEastCFClient = new CloudFormationClient({ region: "us-east-1" });
const euWestCFClient = new CloudFormationClient({ region: "eu-west-1" });

const usEastSSMClient = new SSMClient({ region: "us-east-1" });
const euWestSSMClient = new SSMClient({ region: "eu-west-1" });

export enum Region {
  US_EAST_1,
  EU_WEST_1,
}

export async function readBackendStackOutputs(): Promise<BackendStackOutputs> {
  return (await readStackOutputs("backend", Region.EU_WEST_1)) as BackendStackOutputs;
}

export async function readAccountStackOutputs(): Promise<AccountStackOutputs> {
  return (await readStackOutputsForRawStackName("hassu-account", Region.EU_WEST_1)) as AccountStackOutputs;
}

export async function readDatabaseStackOutputs(): Promise<DatabaseStackOutputs> {
  return (await readStackOutputs("database", Region.EU_WEST_1)) as DatabaseStackOutputs;
}

export async function readPipelineStackOutputs(): Promise<PipelineStackOutputs> {
  return (await readStackOutputs("pipeline", Region.EU_WEST_1)) as PipelineStackOutputs;
}

export async function readFrontendStackOutputs(): Promise<FrontendStackOutputs> {
  return (await readStackOutputs("frontend", Region.US_EAST_1)) as FrontendStackOutputs;
}

async function readStackOutputs(stackName: string, region: Region): Promise<Record<string, string>> {
  return readStackOutputsForRawStackName(`hassu-${stackName}-${BaseConfig.env}`, region);
}

async function readStackOutputsForRawStackName(stackName: string, region: Region): Promise<Record<string, string>> {
  if (!BaseConfig.isActuallyDeployedEnvironment()) {
    return {};
  }
  let cfClient;
  if (region === Region.EU_WEST_1) {
    cfClient = euWestCFClient;
  } else {
    cfClient = usEastCFClient;
  }
  try {
    const output: DescribeStacksCommandOutput = await cfClient.send(
      new DescribeStacksCommand({ StackName: stackName })
    );
    return (
      output.Stacks?.[0].Outputs?.reduce((params, param) => {
        // Include only non-null values. Exclude automatically generated outputs by CDK
        if (param.OutputKey && param.OutputValue && !param.OutputKey.startsWith("ExportsOutput")) {
          params[param.OutputKey] = param.OutputValue;
        }
        return params;
      }, {} as Record<string, string>) || {}
    );
  } catch (e: any) {
    console.warn("warn:" + e.message);
    return {};
  }
}

export type HassuSSMParameters = {
  ExtranetHomePageUrl: string;

  PersonSearchApiAccountTypes: string;
  PersonSearchApiPassword: string;
  PersonSearchApiUsername: string;
  PersonSearchApiURL: string;
  PersonSearchApiPasswordProd: string;
  PersonSearchApiUsernameProd: string;
  PersonSearchApiURLProd: string;

  VelhoUsername: string;
  VelhoPassword: string;
  VelhoApiUrl: string;
  VelhoBaseUrl: string;
  VelhoAuthenticationUrl: string;

  CognitoURL: string;

  basicAuthenticationUsername: string;
  basicAuthenticationPassword: string;

  FrontendDomainName: string;

  SMTPKeyId: string;
  SMTPSecret: string;

  EmailsOn: string;
  EmailsTo: string;

  SonarQubeHostURL: string;
  SonarQubeAccessToken: string;
};

export async function readParametersByPath(path: string, region: Region): Promise<Record<string, string>> {
  let ssmClient: SSMClient;
  if (region === Region.EU_WEST_1) {
    ssmClient = euWestSSMClient;
  } else {
    ssmClient = usEastSSMClient;
  }
  const variables: any = {};
  let nextToken;
  do {
    // noinspection JSUnusedAssignment
    const output: GetParametersByPathCommandOutput = await ssmClient.send(
      new GetParametersByPathCommand({ Path: path, WithDecryption: true, NextToken: nextToken })
    );
    output.Parameters?.forEach((param) => {
      if (param.Name && param.Value) {
        variables[param.Name.replace(path, "")] = param.Value;
      }
    });
    nextToken = output.NextToken;
  } while (nextToken);
  return variables;
}

export async function readParametersForEnv<T extends Record<string, string>>(
  environment: string,
  region: Region
): Promise<T> {
  const results: Record<string, string> = {
    ...(await readParametersByPath("/", region)), // Read global parameters from root
    ...(await readParametersByPath("/" + environment + "/", region)), // Then override with environment specific ones if provided
  };
  return results as T;
}

function writeEnvFile(fileName: string, variables: { [p: string]: string }) {
  let envFile = "# This file is automatically generated\n";
  for (const key in variables) {
    if (variables.hasOwnProperty(key) && variables[key]) {
      envFile += `${key}=${variables[key]}\n`;
    }
  }

  fs.writeFileSync(fileName, envFile);
}

function writeJSONFile(fileName: string, variables: { [p: string]: unknown }) {
  fs.writeFileSync(fileName, JSON.stringify(variables, null, 2));
}

export async function getEnvironmentVariablesFromSSM(variables?: HassuSSMParameters) {
  if (!variables) {
    variables = await readParametersForEnv<HassuSSMParameters>(BaseConfig.infraEnvironment, Region.EU_WEST_1);
  }

  return {
    COGNITO_URL: variables.CognitoURL,
    VELHO_AUTH_URL: variables.VelhoAuthenticationUrl,
    VELHO_API_URL: variables.VelhoApiUrl,
    VELHO_USERNAME: variables.VelhoUsername,
    VELHO_PASSWORD: variables.VelhoPassword,

    PERSON_SEARCH_API_URL: variables.PersonSearchApiURL,
    PERSON_SEARCH_API_USERNAME: variables.PersonSearchApiUsername,
    PERSON_SEARCH_API_PASSWORD: variables.PersonSearchApiPassword,
    PERSON_SEARCH_API_URL_PROD: variables.PersonSearchApiURLProd,
    PERSON_SEARCH_API_USERNAME_PROD: variables.PersonSearchApiUsernameProd,
    PERSON_SEARCH_API_PASSWORD_PROD: variables.PersonSearchApiPasswordProd,
    PERSON_SEARCH_API_ACCOUNT_TYPES: variables.PersonSearchApiAccountTypes,

    NEXT_PUBLIC_VAYLA_EXTRANET_URL: variables.ExtranetHomePageUrl,
    NEXT_PUBLIC_VELHO_BASE_URL: variables.VelhoBaseUrl,

    SMTP_KEY_ID: variables.SMTPKeyId,
    SMTP_SECRET: variables.SMTPSecret,

    EMAILS_ON: variables.EmailsOn,
    EMAILS_TO: variables.EmailsTo,
  };
}

async function main() {
  const searchStackOutputs = await readAccountStackOutputs();
  const backendStackOutputs = await readBackendStackOutputs();
  const frontendStackOutputs = await readFrontendStackOutputs();
  const variables = await readParametersForEnv<HassuSSMParameters>(BaseConfig.infraEnvironment, Region.EU_WEST_1);
  const environmentVariables = await getEnvironmentVariablesFromSSM(variables);
  writeEnvFile(".env.test", {
    SEARCH_DOMAIN: searchStackOutputs.SearchDomainEndpointOutput,
    FRONTEND_DOMAIN_NAME: frontendStackOutputs.CloudfrontPrivateDNSName,
    TABLE_PROJEKTI: Config.projektiTableName,

    ...environmentVariables,
  });

  writeEnvFile(".env.local", {
    REACT_APP_API_URL: backendStackOutputs.AppSyncAPIURL,
    INTERNAL_BUCKET_NAME: Config.internalBucketName,
    ARCHIVE_BUCKET_NAME: Config.archiveBucketName,
    FRONTEND_DOMAIN_NAME: frontendStackOutputs.CloudfrontPrivateDNSName,
    SONARQUBE_HOST_URL: variables.SonarQubeHostURL,
    SONARQUBE_ACCESS_TOKEN: variables.SonarQubeAccessToken,
  });

  const testUsers = await readParametersByPath("/testusers/", Region.EU_WEST_1);
  const testUsersConfig: { [key: string]: unknown } = {};
  for (const user in testUsers) {
    if (testUsers.hasOwnProperty(user)) {
      const [username, password, roles] = testUsers[user].split(" ");
      testUsersConfig[`${user}-username`] = username;
      testUsersConfig[`${user}-password`] = password;
      testUsersConfig[`${user}-roles`] = roles || "Atunnukset,hassu_admin";
    }
  }

  if (BaseConfig.isPermanentEnvironment()) {
    writeJSONFile("cypress.env.json", {
      host:
        "https://" +
        variables.basicAuthenticationUsername +
        ":" +
        variables.basicAuthenticationPassword +
        "@" +
        variables.FrontendDomainName,
      localServer: false,
      ...testUsersConfig,
    });
  } else {
    writeJSONFile("cypress.env.json", {
      host: "http://localhost:3000",
      localServer: true,
      ...testUsersConfig,
    });
  }
}

main().catch((e) => {
  console.log(e);
  process.exit(1);
});
