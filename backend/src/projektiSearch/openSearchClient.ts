import { HttpRequest } from "@aws-sdk/protocol-http";
import { openSearchConfig } from "./openSearchConfig";
import { sendSignedRequest } from "../aws/awsRequest";
import { log } from "../logger";

const domain = openSearchConfig.searchDomain ?? "search-domain-missing";
const type = "_doc";

export async function sendRequest(request: HttpRequest): Promise<unknown> {
  return (await sendSignedRequest(request, "es")).body;
}

export interface SortOrder {
  order: "asc" | "desc";
}

export enum OpenSearchIndexType {
  YLLAPITO = "yllapito",
  JULKINEN = "julkinen",
}

export interface SearchOpts {
  from?: number;
  size?: number;
  sort?: Record<string, SortOrder>[];
  query?: unknown;
  aggs?: unknown;
}

export default class OpenSearchClient {
  private index: string;

  constructor(index: string) {
    this.index = index;
  }

  async putDocument(key: string, document: unknown): Promise<void> {
    const response = (await this.put("/" + type + "/" + key, JSON.stringify(document))) as { result: string };
    if (response["result"] !== "created" && response["result"] !== "updated") {
      log.warn(response);
    }
  }

  async deleteDocument(key: string): Promise<void> {
    await this.delete("/" + type + "/" + key);
  }

  async delete(path: string): Promise<unknown> {
    const request = new HttpRequest({
      headers: {
        host: domain,
      },
      hostname: domain,
      method: "DELETE",
      path: this.index + path,
    });
    return sendRequest(request);
  }

  async deleteIndex(): Promise<unknown> {
    return this.delete("");
  }

  async createIndex(settings: any, mappings: any): Promise<unknown> {
    const body = JSON.stringify({ settings, mappings });
    return this.put("", body);
  }

  async indexExists(): Promise<boolean> {
    const request = new HttpRequest({
      headers: {
        host: domain,
      },
      query: { pretty: "true" },
      hostname: domain,
      method: "HEAD",
      path: this.index,
    });
    try {
      const response = await sendSignedRequest(request, "es");
      return response.statusCode === 200;
    } catch (e) {
      log.info("No index found", e);
    }
    return false;
  }

  async query(query: SearchOpts): Promise<any> {
    const body = JSON.stringify(query);
    log.info("query " + this.index, { query });
    const request = new HttpRequest({
      body,
      headers: {
        "Content-Type": "application/json",
        host: domain,
      },
      hostname: domain,
      method: "POST",
      path: this.index + "/_search",
    });
    return sendRequest(request);
  }

  async getSettings(): Promise<unknown> {
    return this.get("/_settings");
  }

  async putSettings(settings: string): Promise<unknown> {
    await this.closeIndex();

    try {
      return await this.put("/_settings", settings);
    } finally {
      await this.openIndex();
    }
  }

  async getMapping(): Promise<unknown> {
    const mapping = await this.get("/_mapping");
    return (mapping as any).projekti.mappings;
  }

  async putMapping(mapping: string): Promise<unknown> {
    return this.put("/_mapping", mapping);
  }

  async get(path: string): Promise<any> {
    const request = new HttpRequest({
      headers: {
        host: domain,
      },
      query: { pretty: "true" },
      hostname: domain,
      method: "GET",
      path: this.index + path,
    });
    return sendRequest(request);
  }

  async put(path: string, body: string): Promise<unknown> {
    const request = new HttpRequest({
      headers: {
        "Content-Type": "application/json",
        host: domain,
      },
      body,
      hostname: domain,
      method: "PUT",
      path: this.index + path,
    });
    return sendRequest(request);
  }

  protected async closeIndex(): Promise<void> {
    log.info("closeIndex " + this.index);
    const request = new HttpRequest({
      headers: {
        "Content-Type": "application/json",
        host: domain,
      },
      hostname: domain,
      method: "POST",
      path: this.index + "/_close",
    });
    log.info(await sendRequest(request));
  }

  private async openIndex() {
    log.info("openIndex " + this.index);
    const request = new HttpRequest({
      headers: {
        "Content-Type": "application/json",
        host: domain,
      },
      hostname: domain,
      method: "POST",
      path: this.index + "/_open",
    });
    log.info(sendRequest(request));
  }
}
