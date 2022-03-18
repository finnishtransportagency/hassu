import { config } from "../config";
import { getUSEast1ssm } from "../aws/client";
import AWS from "aws-sdk";

export async function createSignedCookies(): Promise<string[]> {
  const cloudFrontPolicy = JSON.stringify({
    Statement: [
      {
        Resource: `https://${config.frontendDomainName}/*`,
        Condition: {
          DateLessThan: {
            "AWS:EpochTime": Math.floor(new Date().getTime() / 1000) + 3600,
          },
        },
      },
    ],
  });

  const cookie = (await getCloudFrontSigner()).getSignedCookie({
    policy: cloudFrontPolicy,
  });

  const setCookieAttributes = `; Path=/; Secure; SameSite=None`;

  return [
    `CloudFront-Key-Pair-Id=${cookie["CloudFront-Key-Pair-Id"]}${setCookieAttributes}`,
    `CloudFront-Policy=${cookie["CloudFront-Policy"]}${setCookieAttributes}`,
    `CloudFront-Signature=${cookie["CloudFront-Signature"]}${setCookieAttributes}`,
  ];
}

async function getCloudFrontSigner() {
  if (!(globalThis as any).cloudFrontSigner) {
    const parameterKey = "/" + config.env + "/outputs/FrontendPublicKeyId";
    const publicKeyId = await getUSEast1ssm().getParameter({ Name: parameterKey }).promise();
    if (!publicKeyId.Parameter?.Value) {
      throw new Error("Configuration error: SSM parameter " + parameterKey + " not found");
    }
    (globalThis as any).cloudFrontSigner = new AWS.CloudFront.Signer(
      publicKeyId.Parameter.Value,
      config.frontendPrivateKey || ""
    );
  }
  return (globalThis as any).cloudFrontSigner;
}
