import { openSearchConfig } from "./openSearchConfig";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { sendSignedRequest } from "../aws/awsRequest";
import { log } from "../logger";
import { Kieli } from "../../../common/graphql/apiModel";

const domain = openSearchConfig.searchDomain || "search-domain-missing";
const type = "_doc";

export interface SortOrder {
  order: "asc" | "desc";
}

export interface SearchOpts {
  from?: number;
  size?: number;
  sort?: Record<string, SortOrder>[];
  query?: unknown;
  aggs?: unknown;
}

export async function sendRequest(request: HttpRequest): Promise<unknown> {
  return (await sendSignedRequest(request, "es")).body;
}

export enum OpenSearchIndexType {
  YLLAPITO = "yllapito",
  JULKINEN = "julkinen",
}

export abstract class OpenSearchClient {
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

  async query(query: SearchOpts): Promise<any> {
    const body = JSON.stringify(query);
    log.info("query " + this.index);
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

class OpenSearchClientYllapito extends OpenSearchClient {
  constructor() {
    super(openSearchConfig.opensearchYllapitoIndex);
  }
}

class OpenSearchClientJulkinen extends OpenSearchClient {
  constructor(kieli: Kieli) {
    super(openSearchConfig.opensearchJulkinenIndexPrefix + kieli.toLowerCase());
  }
}

class OpenSearchClientIlmoitustauluSyote extends OpenSearchClient {
  constructor() {
    super(openSearchConfig.opensearchIlmoitustauluSyoteIndex);
  }
}

export const openSearchClientYllapito = new OpenSearchClientYllapito();
export const openSearchClientJulkinen = {
  [Kieli.SUOMI]: new OpenSearchClientJulkinen(Kieli.SUOMI),
  [Kieli.RUOTSI]: new OpenSearchClientJulkinen(Kieli.RUOTSI),
  [Kieli.SAAME]: new OpenSearchClientJulkinen(Kieli.SAAME),
};
export const openSearchClientIlmoitustauluSyote = new OpenSearchClientIlmoitustauluSyote();
