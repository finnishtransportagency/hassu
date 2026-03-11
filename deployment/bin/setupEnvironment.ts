/* tslint:disable:no-console */
// This script examines stack outputs and parameter store parameters, and writes .env.local and .env.test files

import { execSync } from "child_process";
import { BaseConfig } from "../../common/BaseConfig";
import * as fs from "fs";
import path from "path";
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
    TABLE_KIINTEISTONOMISTAJA: Config.kiinteistonomistajaTableName,
    TABLE_PROJEKTI_MUISTUTTAJA: Config.projektiMuistuttajaTableName,
    TABLE_TIEDOTE: Config.tiedoteTableName,
    TABLE_NAHTAVILLAOLOVAIHEJULKAISU: Config.nahtavillaoloVaiheJulkaisuTableName,
    TABLE_PROJEKTI_DATA: Config.projektiDataTableName,
    INTERNAL_BUCKET_NAME: Config.internalBucketName,
    EVENT_SQS_URL: backendStackOutputs.EventSqsUrl,
    HYVAKSYMISESITYS_SQS_URL: backendStackOutputs.HyvaksymisEsitysSqsUrl,
    INFRA_ENVIRONMENT: Config.infraEnvironment,
    YLLAPITO_BUCKET_NAME: Config.yllapitoBucketName,
    PDF_GENERATOR_LAMBDA_ARN: backendStackOutputs.PdfGeneratorLambda,
    ...environmentVariables,
  });

  if (BaseConfig.isPermanentEnvironment()) {
    writeEnvFile(".env.local", {});
  } else {
    let env: Record<string, string> = {
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
      HYVAKSYMISESITYS_SQS_URL: backendStackOutputs.HyvaksymisEsitysSqsUrl,
      // Tuki asianhallinnan käynnistämiseen testilinkillä [oid].dev.ts kautta. Ei tarvita kun asianhallintaintegraatio on automaattisesti käytössä.
      ASIANHALLINTA_SQS_URL: variables.AsianhallintaSQSUrl,
      VELHO_BASE_URL: environmentVariables.VELHO_BASE_URL,
      EVK_ACTIVATION_DATE: environmentVariables.EVK_ACTIVATION_DATE,
      KEYCLOAK_CLIENT_ID: variables.KeycloakClientId,
      KEYCLOAK_DOMAIN: variables.KeycloakDomain,
      KEYCLOAK_CLIENT_SECRET: variables.KeycloakClientSecret,
      VAYLA_EXTRANET_URL: environmentVariables.VAYLA_EXTRANET_URL,
      AJANSIIRTO_SALLITTU: environmentVariables.AJANSIIRTO_SALLITTU,
      INFRA_ENVIRONMENT: Config.infraEnvironment,
      VELHO_AUTH_URL: environmentVariables.VELHO_AUTH_URL,
      VELHO_API_URL: environmentVariables.VELHO_API_URL,
      VELHO_USERNAME: environmentVariables.VELHO_USERNAME,
      VELHO_PASSWORD: environmentVariables.VELHO_PASSWORD,
    };
    if (Config.isDeveloperEnvironment()) {
      const VERSION = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
      env = {
        ...env,
        AWS_SDK_LOAD_CONFIG: "true",
        AWS_REGION: "eu-west-1",
        "x-hassudev-uid": process.env.HASSUDEV_UID ?? "Arvoa ei ole määritetty process.env objektissa",
        "x-hassudev-roles": process.env.HASSUDEV_ROLES ?? "Arvoa ei ole määritetty process.env objektissa",
        REACT_APP_API_URL: "http://localhost:3000/graphql",
        APPSYNC_URL: backendStackOutputs.AppSyncAPIURL,
        VERSION,
        AJANSIIRTO_SALLITTU: "true",
      };

      writePublicEnvFile({
        VERSION,
        ENVIRONMENT: process.env.ENVIRONMENT,
        VAYLA_EXTRANET_URL: environmentVariables.VAYLA_EXTRANET_URL,
        VELHO_BASE_URL: environmentVariables.VELHO_BASE_URL,
        AJANSIIRTO_SALLITTU: "true",
        REACT_APP_API_URL: "http://localhost:3000/graphql",
        REACT_APP_API_KEY: backendStackOutputs.AppSyncAPIKey,
        FRONTEND_DOMAIN_NAME: frontendStackOutputs.CloudfrontPrivateDNSName,
        KEYCLOAK_CLIENT_ID: variables.KeycloakClientId,
        KEYCLOAK_DOMAIN: variables.KeycloakDomain,
        EVK_ACTIVATION_DATE: environmentVariables.EVK_ACTIVATION_DATE,
      });
    }
    writeEnvFile(".env.local", env);
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

function writePublicEnvFile(variables: { [p: string]: string | undefined }) {
  const publicAssetsDir = path.join(process.cwd(), "public", "assets");
  const filePath = path.join(publicAssetsDir, "__env.js");

  const data = `// This file is automatically generated.\n` + `window.__ENV = ${JSON.stringify(variables, null, 2)};\n`;

  fs.writeFileSync(filePath, data, { encoding: "utf8" });
}

function writeJSONFile(fileName: string, variables: { [p: string]: unknown }) {
  fs.writeFileSync(fileName, JSON.stringify(variables, null, 2));
}

main().catch((e) => {
  console.log(e);
  process.exit(1);
});
