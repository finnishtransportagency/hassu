import { config } from "../config";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { sendSignedRequest } from "../aws/awsRequest";
import { log } from "../logger";

const domain = config.searchDomain;
const index = "projekti";
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

export class OpenSearchClient {
  async putProjekti(oid: string, projekti: unknown): Promise<unknown> {
    return this.put(index, "/" + type + "/" + oid, JSON.stringify(projekti));
  }

  async deleteProjekti(oid: string): Promise<void> {
    await this.delete("/" + type + "/" + oid);
  }

  async delete(path: string): Promise<unknown> {
    const request = new HttpRequest({
      headers: {
        host: domain,
      },
      hostname: domain,
      method: "DELETE",
      path: index + path,
    });
    return sendRequest(request);
  }

  async deleteIndex(): Promise<unknown> {
    return this.delete("");
  }

  async query(query: SearchOpts): Promise<any> {
    const body = JSON.stringify(query);
    const request = new HttpRequest({
      body,
      headers: {
        "Content-Type": "application/json",
        host: domain,
      },
      hostname: domain,
      method: "POST",
      path: index + "/_search",
    });
    return sendRequest(request);
  }

  async getSettings(theIndex: string): Promise<unknown> {
    return OpenSearchClient.get(theIndex, "/_settings");
  }

  async putSettings(theIndex: string, settings: string): Promise<unknown> {
    await OpenSearchClient.closeIndex(theIndex);

    try {
      return await this.put(theIndex, "/_settings", settings);
    } finally {
      await OpenSearchClient.openIndex(theIndex);
    }
  }

  async getMapping(theIndex: string): Promise<unknown> {
    const mapping = await OpenSearchClient.get(theIndex, "/_mapping");
    return (mapping as any).projekti.mappings;
  }

  async putMapping(theIndex: string, mapping: string): Promise<unknown> {
    return this.put(theIndex, "/_mapping", mapping);
  }

  private static get(theIndex: string, path: string) {
    const request = new HttpRequest({
      headers: {
        host: domain,
      },
      query: { pretty: "true" },
      hostname: domain,
      method: "GET",
      path: theIndex + path,
    });
    return sendRequest(request);
  }

  put(theIndex: string, path: string, body: string): Promise<unknown> {
    const request = new HttpRequest({
      headers: {
        "Content-Type": "application/json",
        host: domain,
      },
      body,
      hostname: domain,
      method: "PUT",
      path: theIndex + path,
    });
    return sendRequest(request);
  }

  private static async closeIndex(theIndex: string) {
    log.info("closeIndex " + theIndex);
    const request = new HttpRequest({
      headers: {
        "Content-Type": "application/json",
        host: domain,
      },
      hostname: domain,
      method: "POST",
      path: theIndex + "/_close",
    });
    log.info(await sendRequest(request));
  }

  private static async openIndex(theIndex: string) {
    log.info("openIndex " + theIndex);
    const request = new HttpRequest({
      headers: {
        "Content-Type": "application/json",
        host: domain,
      },
      hostname: domain,
      method: "POST",
      path: theIndex + "/_open",
    });
    log.info(sendRequest(request));
  }
}

export const openSearchClient = new OpenSearchClient();
