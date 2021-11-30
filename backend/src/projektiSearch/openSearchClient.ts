import { config } from "../config";
import log from "loglevel";

const { HttpRequest } = require("@aws-sdk/protocol-http");
const { defaultProvider } = require("@aws-sdk/credential-provider-node");
const { SignatureV4 } = require("@aws-sdk/signature-v4");
const { NodeHttpHandler } = require("@aws-sdk/node-http-handler");
const { Sha256 } = require("@aws-crypto/sha256-browser");

const region = process.env.AWS_REGION;
const domain = config.searchDomain;
const index = "projekti";
const type = "_doc";

async function sendRequest(request: typeof HttpRequest): Promise<any> {
  // Sign the request
  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region,
    service: "es",
    sha256: Sha256,
  });
  const signedRequest = await signer.sign(request);

  // Send the request
  const client = new NodeHttpHandler();
  const { response } = await client.handle(signedRequest);
  let responseBody = "";
  return new Promise<any>((resolve) => {
    response.body.on("data", (chunk) => {
      responseBody += chunk;
    });
    response.body.on("end", () => {
      log.info("Response body: " + responseBody);
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

  async query(query: any): Promise<any> {
    const request = new HttpRequest({
      body: JSON.stringify({
        size: 100,
        query,
      }),
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
