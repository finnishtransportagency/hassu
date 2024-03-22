// This script examines stack outputs and parameter store parameters, and writes .env.local and .env.test files

import { CloudFormation, DescribeStacksOutput } from "@aws-sdk/client-cloudformation";
import { GetParametersByPathResult, SSM } from "@aws-sdk/client-ssm";
import { BaseConfig } from "../../common/BaseConfig";
import { BackendStackOutputs } from "./hassu-backend";
import { DatabaseStackOutputs } from "./hassu-database";
import { FrontendStackOutputs } from "./hassu-frontend";
import { PipelineStackOutputs } from "./hassu-pipelines";
import { AccountStackOutputs } from "./hassu-account";

const usEastCFClient = new CloudFormation({ region: "us-east-1" });
const euWestCFClient = new CloudFormation({ region: "eu-west-1" });

const usEastSSMClient = new SSM({ region: "us-east-1" });
const euWestSSMClient = new SSM({ region: "eu-west-1" });

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
  return (await readStackOutputs("pipelines", Region.EU_WEST_1)) as PipelineStackOutputs;
}

export async function readFrontendStackOutputs(): Promise<FrontendStackOutputs> {
  return (await readStackOutputs("frontend", Region.US_EAST_1)) as FrontendStackOutputs;
}

async function readStackOutputs(stackName: string, region: Region): Promise<Record<string, string>> {
  return readStackOutputsForRawStackName(`hassu-${stackName}-${BaseConfig.env}`, region);
}

async function readStackOutputsForRawStackName(stackName: string, region: Region): Promise<Record<string, string>> {
  if (!BaseConfig.isActuallyDeployedEnvironment() || BaseConfig.env === "localstack") {
    return {};
  }
  let cfClient: CloudFormation;
  if (region === Region.EU_WEST_1) {
    cfClient = euWestCFClient;
  } else {
    cfClient = usEastCFClient;
  }
  try {
    const output: DescribeStacksOutput = await cfClient.describeStacks({ StackName: stackName });
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
  EmailsFrom: string;

  AjansiirtoSallittu: string;

  SonarQubeHostURL: string;
  SonarQubeAccessToken: string;

  IlmoitustauluSyoteCredentials: string;

  AsianhallintaSQSUrl: string;

  KeycloakClientId: string;
  KeycloakDomain: string;
  KeycloakClientSecret: string;
};

export async function readParametersByPath(path: string, region: Region): Promise<Record<string, string>> {
  let ssmClient: SSM;
  if (region === Region.EU_WEST_1) {
    ssmClient = euWestSSMClient;
  } else {
    ssmClient = usEastSSMClient;
  }
  const variables: any = {};
  let nextToken;
  do {
    // noinspection JSUnusedAssignment
    const output: GetParametersByPathResult = await ssmClient.getParametersByPath({
      Path: path,
      WithDecryption: true,
      NextToken: nextToken,
    });
    output.Parameters?.forEach((param) => {
      if (param.Name && param.Value) {
        variables[param.Name.replace(path, "")] = param.Value;
      }
    });
    nextToken = output.NextToken;
  } while (nextToken);
  return variables;
}

export async function readParametersForEnv<T extends Record<string, string>>(environment: string, region: Region): Promise<T> {
  let envParams;
  if (!BaseConfig.isPermanentEnvironment() && BaseConfig.infraEnvironment !== BaseConfig.env) {
    envParams = {
      ...(await readParametersByPath("/" + BaseConfig.env + "/", region)),
      ...(await readParametersByPath("/" + BaseConfig.env + "/outputs/", region)),
    };
  }
  const results: Record<string, string> = {
    ...(await readParametersByPath("/", region)), // Read global parameters from root
    ...(await readParametersByPath("/" + environment + "/", region)), // Then override with environment specific ones if provided
    ...(await readParametersByPath("/" + environment + "/outputs/", region)), // Then override with environment specific ones if provided
    ...envParams,
  };
  return results as T;
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

    EMAILS_ON: variables.EmailsOn,
    EMAILS_TO: variables.EmailsTo,

    NEXT_PUBLIC_AJANSIIRTO_SALLITTU: variables.AjansiirtoSallittu,

    KEYCLOAK_CLIENT_ID: variables.KeycloakClientId,
    KEYCLOAK_DOMAIN: variables.KeycloakDomain,
  };
}
