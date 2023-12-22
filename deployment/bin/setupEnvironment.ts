/* tslint:disable:no-console */
// This script examines stack outputs and parameter store parameters, and writes .env.local and .env.test files

import { BaseConfig } from "../../common/BaseConfig";
import * as fs from "fs";
import { Config } from "../lib/config";
import {
  getEnvironmentVariablesFromSSM,
  HassuSSMParameters,
  readAccountStackOutputs,
  readBackendStackOutputs,
  readFrontendStackOutputs,
  readParametersByPath,
  readParametersForEnv,
  Region,
} from "../lib/setupEnvironment";

async function main() {
  const accountStackOutputs = await readAccountStackOutputs();
  const backendStackOutputs = await readBackendStackOutputs();
  const frontendStackOutputs = await readFrontendStackOutputs();
  const variables = await readParametersForEnv<HassuSSMParameters>(BaseConfig.infraEnvironment, Region.EU_WEST_1);
  const environmentVariables = await getEnvironmentVariablesFromSSM(variables);
  writeEnvFile(".env.test", {
    SEARCH_DOMAIN: accountStackOutputs.SearchDomainEndpointOutput,
    FRONTEND_DOMAIN_NAME: frontendStackOutputs.CloudfrontPrivateDNSName,
    TABLE_PROJEKTI: Config.projektiTableName,
    TABLE_LYHYTOSOITE: Config.lyhytOsoiteTableName,
    TABLE_FEEDBACK: Config.feedbackTableName,
    INTERNAL_BUCKET_NAME: Config.internalBucketName,
    EVENT_SQS_URL: backendStackOutputs.EventSqsUrl,
    INFRA_ENVIRONMENT: Config.infraEnvironment,
    ...environmentVariables,
  });

  if (BaseConfig.isPermanentEnvironment()) {
    writeEnvFile(".env.local", {});
  } else {
    writeEnvFile(".env.local", {
      REACT_APP_API_URL: backendStackOutputs.AppSyncAPIURL,
      INTERNAL_BUCKET_NAME: Config.internalBucketName,
      PUBLIC_BUCKET_NAME: Config.publicBucketName,
      YLLAPITO_BUCKET_NAME: Config.internalBucketName,
      FRONTEND_DOMAIN_NAME: frontendStackOutputs.CloudfrontPrivateDNSName,
      SONARQUBE_HOST_URL: variables.SonarQubeHostURL,
      SONARQUBE_ACCESS_TOKEN: variables.SonarQubeAccessToken,
      SEARCH_DOMAIN: accountStackOutputs.SearchDomainEndpointOutput,
      TABLE_PROJEKTI: Config.projektiTableName,
      TABLE_LYHYTOSOITE: Config.lyhytOsoiteTableName,
      TABLE_FEEDBACK: Config.feedbackTableName,
      EVENT_SQS_URL: backendStackOutputs.EventSqsUrl,
      // Tuki asianhallinnan käynnistämiseen testilinkillä [oid].dev.ts kautta. Ei tarvita kun asianhallintaintegraatio on automaattisesti käytössä.
      ASIANHALLINTA_SQS_URL: variables.AsianhallintaSQSUrl,
      NEXT_PUBLIC_VELHO_BASE_URL: environmentVariables.NEXT_PUBLIC_VELHO_BASE_URL,
      SUOMI_FI_COGNITO_DOMAIN: variables.SuomifiCognitoDomain,
      SUOMI_FI_USERPOOL_CLIENT_ID: variables.SuomifiUserPoolClientId,
      KEYCLOAK_CLIENT_ID: variables.KeycloakClientId,
      KEYCLOAK_LOGOUT_PATH: variables.KeycloakLogoutPath,
      SUOMI_FI_USERPOOL_CLIENT_SECRET: variables.SuomifiUserPoolClientSecret,
    });
  }
  const testUsers = await readParametersByPath("/testusers/", Region.EU_WEST_1);
  const testUsersConfig: { [key: string]: unknown } = {};
  for (const user in testUsers) {
    // eslint-disable-next-line no-prototype-builtins
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
        variables.FrontendDomainName.split(",")?.[0]?.trim(),
      localServer: false,
      IlmoitustauluSyoteCredentials: variables.IlmoitustauluSyoteCredentials,
      apiKey: backendStackOutputs.AppSyncAPIKey,
      ...testUsersConfig,
    });
  } else {
    writeJSONFile("cypress.env.json", {
      host: "http://localhost:3000",
      localServer: true,
      IlmoitustauluSyoteCredentials: variables.IlmoitustauluSyoteCredentials,
      ...testUsersConfig,
    });
  }
}

function writeEnvFile(fileName: string, variables: { [p: string]: string }) {
  let envFile = "# This file is automatically generated\n";
  for (const key in variables) {
    // eslint-disable-next-line no-prototype-builtins
    if (variables.hasOwnProperty(key) && variables[key]) {
      envFile += `${key}=${variables[key]}\n`;
    }
  }

  fs.writeFileSync(fileName, envFile);
}

function writeJSONFile(fileName: string, variables: { [p: string]: unknown }) {
  fs.writeFileSync(fileName, JSON.stringify(variables, null, 2));
}

main().catch((e) => {
  console.log(e);
  process.exit(1);
});
