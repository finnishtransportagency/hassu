import { config } from "../config";

import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { Sha256 } from "@aws-crypto/sha256-browser";
import { HttpRequest as IHttpRequest } from "@aws-sdk/types";
import { HttpRequest } from "@aws-sdk/protocol-http";

const region = process.env.AWS_REGION;
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

async function sendRequest(request: HttpRequest): Promise<any> {
  // Sign the request
  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region,
    service: "es",
    sha256: Sha256,
  });
  const signedRequest: IHttpRequest = await signer.sign(request);

  // Send the request
  const client = new NodeHttpHandler();

  const { response } = await client.handle(signedRequest as HttpRequest);
  let responseBody = "";
  return new Promise<any>((resolve) => {
    response.body.on("data", (chunk) => {
      responseBody += chunk;
    });
    response.body.on("end", () => {
      resolve(JSON.parse(responseBody));
    });
  });
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

  async deleteProjekti(oid: string): Promise<any> {
    const request = new HttpRequest({
      headers: {
        host: domain,
      },
      hostname: domain,
      method: "DELETE",
      path: index + "/" + type + "/" + oid,
    });
    return await sendRequest(request);
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
    return await sendRequest(request);
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
