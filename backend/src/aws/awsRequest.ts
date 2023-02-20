import { HttpRequest } from "@aws-sdk/protocol-http";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import AWS from "aws-sdk/global";
import { Sha256 } from "@aws-crypto/sha256-browser";
import { HttpRequest as IHttpRequest } from "@aws-sdk/types";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";

const client = new NodeHttpHandler();

export async function sendSignedRequest(request: HttpRequest, service: string): Promise<{ body: unknown; statusCode: number }> {
  // Sign the request
  if (!AWS.config.credentials) {
    throw new Error("No AWS credentials available");
  }
  const signer = new SignatureV4({
    credentials: AWS.config.credentials,
    region: "eu-west-1",
    service,
    sha256: Sha256,
  });
  const signedRequest: IHttpRequest = await signer.sign(request);

  // Send the request

  const { response } = await client.handle(signedRequest as HttpRequest);
  let responseBody = "";
  return new Promise<{ body: unknown; statusCode: number }>((resolve) => {
    response.body.on("data", (chunk: string) => {
      responseBody += chunk;
    });
    response.body.on("end", () => {
      resolve({ body: JSON.parse(responseBody), statusCode: response.statusCode });
    });
  });
}
