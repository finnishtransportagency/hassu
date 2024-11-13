import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-browser";
import fetch from "cross-fetch";

import { defaultProvider } from "@aws-sdk/credential-provider-node";

export async function sendSignedRequest(request: HttpRequest, service: string): Promise<{ body: unknown; statusCode: number }> {
  // Sign the request
  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: "eu-west-1",
    service,
    sha256: Sha256,
  });
  const { headers, body, method, hostname, path } = await signer.sign(request);

  const response = await fetch("https://" + hostname + path, {
    headers,
    body,
    method,
  });
  const responseBody = await response.json();
  return { body: responseBody, statusCode: response.status };
}
