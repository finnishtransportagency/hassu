import { config } from "../config";
import { HttpRequest } from "@aws-sdk/protocol-http";
import { sendSignedRequest } from "../aws/awsRequest";

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
  async putProjekti(oid: string, projekti: any): Promise<any> {
    // Create the HTTP request
    const request = new HttpRequest({
      body: JSON.stringify(projekti),
      headers: {
        "Content-Type": "application/json",
        host: domain,
      },
      hostname: domain,
      method: "PUT",
      path: index + "/" + type + "/" + oid,
    });
    return await sendRequest(request);
  }

  async deleteProjekti(oid: string): Promise<void> {
    const request = new HttpRequest({
      headers: {
        host: domain,
      },
      hostname: domain,
      method: "DELETE",
      path: index + "/" + type + "/" + oid,
    });
    await sendRequest(request);
  }

  async deleteIndex(): Promise<void> {
    const request = new HttpRequest({
      headers: {
        host: domain,
      },
      hostname: domain,
      method: "DELETE",
      path: index,
    });
    await sendRequest(request);
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
    return await sendRequest(request);
  }
}

export const openSearchClient = new OpenSearchClient();
