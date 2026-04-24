// Contains code generated or recommended by Amazon Q
import fetch from "cross-fetch";
import { assertIsDefined } from "../util/assertions";
import { config } from "../config";
import { ParameterNotFound, SSM } from "@aws-sdk/client-ssm";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { log } from "../logger";
import { SuomiFiConfig } from "../suomifi/viranomaispalvelutwsinterface/suomifi";
import { PrhConfig } from "../mml/prh/prh";

interface ParameterStoreResponse {
  Parameter: ParameterData;
  ResultMetadata: never;
}

interface ParameterData {
  ARN: string;
  DataType: string;
  LastModifiedDate: string;
  Name: string;
  Selector?: string;
  SourceResult?: string;
  Type: string;
  Value: string;
  Version: number;
}

const PARAMETER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minuuttia
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 100;

interface CachedParameter {
  value: string | undefined;
  timestamp: number;
}

class Parameters {
  private cache = new Map<string, CachedParameter>();
  private async getParameterForEnv(paramName: string, envName?: string): Promise<string | undefined> {
    let name;
    if (envName) {
      name = "/" + envName + "/" + paramName;
    } else {
      name = paramName;
    }
    if (config.isInTest || process.env.USE_SSM) {
      const credentials = defaultProvider({ profile: "hassudev" });
      const ssm = new SSM({ region: "eu-west-1", credentials });
      try {
        const response = await ssm.getParameter({ Name: name, WithDecryption: true });
        return response.Parameter?.Value;
      } catch (e) {
        if (e instanceof ParameterNotFound) {
          return;
        }
        throw e;
      }
    } else {
      assertIsDefined(process.env.AWS_SESSION_TOKEN, "process.env.AWS_SESSION_TOKEN puuttuu!");
      const url = `http://localhost:2773/systemsmanager/parameters/get/?name=${encodeURIComponent(name)}&withDecryption=true`;
      const headers = { "X-Aws-Parameters-Secrets-Token": process.env.AWS_SESSION_TOKEN };
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await fetch(url, { headers });
          if (response.ok) {
            const data = (await response.json()) as ParameterStoreResponse;
            return data.Parameter.Value;
          } else if (!envName) {
            log.error("getParameter(" + name + ") failed", { response });
          } else {
            log.info("getParameter(" + name + ") failed", { response });
          }
          break;
        } catch (e) {
          if (attempt < MAX_RETRIES) {
            log.warn(`SSM Lambda Extension -kutsu epäonnistui (yritys ${attempt + 1}/${MAX_RETRIES + 1}), yritetään uudelleen`, {
              name,
              error: e instanceof Error ? e.message : String(e),
            });
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
          } else {
            log.error(`SSM Lambda Extension -kutsu epäonnistui kaikkien yritysten jälkeen`, {
              name,
              error: e instanceof Error ? e.message : String(e),
            });
            throw e;
          }
        }
      }
    }
    return undefined;
  }

  async getParameter(paramName: string): Promise<string | undefined> {
    const cached = this.cache.get(paramName);
    if (cached && Date.now() - cached.timestamp < PARAMETER_CACHE_TTL_MS) {
      return cached.value;
    }
    const value = await this.getParameterUncached(paramName);
    this.cache.set(paramName, { value, timestamp: Date.now() });
    return value;
  }

  private async getParameterUncached(paramName: string): Promise<string | undefined> {
    let value: string | undefined;
    if (process.env.ENVIRONMENT) {
      value = await this.getParameterForEnv(paramName, process.env.ENVIRONMENT);
    }
    if (value) {
      return value;
    }
    if (process.env.INFRA_ENVIRONMENT && process.env.ENVIRONMENT !== process.env.INFRA_ENVIRONMENT) {
      value = await this.getParameterForEnv(paramName, process.env.INFRA_ENVIRONMENT);
    }
    if (value) {
      return value;
    }
    return this.getParameterForEnv(paramName);
  }

  async getRequiredInfraParameter(paramName: string): Promise<string> {
    assertIsDefined(process.env.INFRA_ENVIRONMENT, "INFRA_ENVIRONMENT pitää olla määritelty");
    let value = await this.getParameterForEnv(paramName, process.env.INFRA_ENVIRONMENT);
    if (value) {
      return value;
    }
    value = await this.getParameterForEnv(paramName);
    if (!value) {
      throw new Error(paramName + " ei löytynyt SSM:stä ympäristöstä:" + process.env.INFRA_ENVIRONMENT);
    }
    return value;
  }

  async isAsianhallintaIntegrationEnabled(): Promise<boolean> {
    return (await this.getParameter("AsianhallintaIntegrationEnabled")) === "true";
  }

  async isUspaIntegrationEnabled(): Promise<boolean> {
    return (await this.getParameter("UspaIntegrationEnabled")) === "true";
  }

  async getUspaBaseUrl(): Promise<string | undefined> {
    return await this.getParameter("UspaBaseUrl");
  }

  async getAshaBaseUrl(): Promise<string | undefined> {
    return await this.getParameter("AshaBaseUrl");
  }

  async getAsianhallintaSQSUrl() {
    // Tuki asianhallinnan käynnistämiseen testilinkillä [oid].dev.ts kautta. Ei tarvita kun asianhallintaintegraatio on automaattisesti käytössä.
    return this.getParamOrVariable("outputs/AsianhallintaSQSUrl", "ASIANHALLINTA_SQS_URL");
  }

  async getKiinteistoSQSUrl() {
    return this.getParameter("outputs/KiinteistoSQSUrl");
  }

  async getKeycloakDomain() {
    return this.getRequiredAccountParameter("KeycloakDomain");
  }

  async getKeycloakPrivateDomain() {
    return this.getRequiredAccountParameter("KeycloakPrivateDomain");
  }

  async getKeycloakClientId() {
    return this.getRequiredAccountParameter("KeycloakClientId");
  }

  async getKeycloakUsername() {
    return this.getRequiredAccountParameter("KeycloakUsername");
  }

  async getKeycloakPassword() {
    return this.getRequiredAccountParameter("KeycloakPassword");
  }

  async isSuomiFiIntegrationEnabled(): Promise<boolean> {
    return (await this.getParameter("SuomiFiIntegrationEnabled")) === "true";
  }

  async isSuomiFiViestitIntegrationEnabled(): Promise<boolean> {
    return (await this.getParameter("SuomiFiViestitIntegrationEnabled")) === "true";
  }

  async getIndexerSQSUrl() {
    return this.getParamOrVariable("outputs/IndexerSQSUrl");
  }

  async getOmistajaIndexerSQSUrl() {
    return this.getParamOrVariable("outputs/OmistajaIndexerSQSUrl");
  }

  async getMuistuttajaIndexerSQSUrl() {
    return this.getParamOrVariable("outputs/MuistuttajaIndexerSQSUrl");
  }

  async getSuomiFiConfig() {
    const param = await this.getRequiredAccountParameter("SuomiFiConfig");
    const cfg: Partial<SuomiFiConfig> = {};
    param.split("\n").forEach((e) => {
      const v = e.split("=");
      cfg[v[0] as keyof SuomiFiConfig] = v[1].trim();
    });
    return cfg as SuomiFiConfig;
  }

  async getSuomiFiCertificate() {
    return this.getParameterForEnv("SuomiFiCertificate");
  }

  async getSuomiFiPrivateKey() {
    return this.getParameterForEnv("SuomiFiPrivateKey");
  }

  async getSuomiFiSQSUrl() {
    return this.getParameter("outputs/SuomiFiSQSUrl");
  }

  async getIsEvkActivated() {
    return this.getRequiredParameter("EvkActivationDate");
  }

  getMmlApiKey() {
    return this.getRequiredParameter("MmlApiKey");
  }

  getKtjBaseUrl() {
    return this.getRequiredParameter("KtjBaseUrl");
  }

  getOgcBaseUrl() {
    return this.getRequiredParameter("OgcBaseUrl");
  }

  getOgcApiKey() {
    return this.getRequiredParameter("OgcApiKey");
  }

  getOgcApiExmaples() {
    return this.getRequiredParameter("OgcApiExamples");
  }

  async getPrhConfig() {
    const param = await this.getRequiredParameter("PrhConfig");
    const cfg: Partial<PrhConfig> = {};
    param.split("\n").forEach((e) => {
      const v = e.split("=");
      cfg[v[0] as keyof PrhConfig] = v[1].trim();
    });
    return cfg as PrhConfig;
  }

  private async getRequiredAccountParameter(paramName: string): Promise<string> {
    const value = await this.getParameterForEnv(paramName);
    if (!value) {
      throw new Error(paramName + " ei löytynyt SSM:stä");
    }
    return value;
  }

  private async getRequiredParameter(paramName: string): Promise<string> {
    const value = await this.getParameter(paramName);
    if (!value) {
      throw new Error(paramName + " ei löytynyt SSM:stä");
    }
    return value;
  }

  private getParamOrVariable(ssmPath: string, envVariableName?: string) {
    const url = envVariableName && process.env[envVariableName];
    if (url) {
      return url;
    }
    return this.getParameter(ssmPath);
  }
}

export const parameters = new Parameters();
