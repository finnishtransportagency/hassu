import fetch from "cross-fetch";
import { assertIsDefined } from "../util/assertions";
import { log } from "../logger";

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

class Parameters {
  private async getParameterForEnv(paramName: string, envName: string | undefined): Promise<string | undefined> {
    let name;
    if (envName) {
      name = "/" + envName + "/" + paramName;
    } else {
      name = paramName;
    }
    assertIsDefined(process.env.AWS_SESSION_TOKEN, "process.env.AWS_SESSION_TOKEN puuttuu!");
    const response = await fetch(
      `http://localhost:2773/systemsmanager/parameters/get/?name=${encodeURIComponent(name)}&withDecryption=true`,
      {
        headers: {
          "X-Aws-Parameters-Secrets-Token": process.env.AWS_SESSION_TOKEN,
        },
      }
    );
    if (response.ok) {
      const data = (await response.json()) as ParameterStoreResponse;
      return data.Parameter.Value;
    }
    log.error(response);
    throw new Error("Virhe parametrin lukemisessa");
  }

  async getParameter(paramName: string): Promise<string | undefined> {
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
    return this.getParameterForEnv(paramName, undefined);
  }

  async getRequiredInfraParameter(paramName: string): Promise<string> {
    assertIsDefined(process.env.INFRA_ENVIRONMENT);
    const value = await this.getParameterForEnv(paramName, process.env.INFRA_ENVIRONMENT);
    if (!value) {
      throw new Error(paramName + " ei löytynyt SSM:stä ympäristöstä:" + process.env.INFRA_ENVIRONMENT);
    }
    return value;
  }
}

export const parameters = new Parameters();
