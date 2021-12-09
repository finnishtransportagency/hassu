import { config } from "../config";
import { GetParameterCommand } from "@aws-sdk/client-ssm";
import { getUSEast1ssmClient } from "../aws/clients";

const AWS = require("aws-sdk");

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

  const setCookieAttributes = `; Path=/; Secure; HttpOnly; SameSite=None`;

  return [
    `CloudFront-Key-Pair-Id=${cookie["CloudFront-Key-Pair-Id"]}${setCookieAttributes}`,
    `CloudFront-Policy=${cookie["CloudFront-Policy"]}${setCookieAttributes}`,
    `CloudFront-Signature=${cookie["CloudFront-Signature"]}${setCookieAttributes}`,
  ];
}

async function getCloudFrontSigner() {
  if (!globalThis.cloudFrontSigner) {
    const publicKeyId = await getUSEast1ssmClient().send(
      new GetParameterCommand({ Name: config.frontendPublicKeyIdPath })
    );
    globalThis.cloudFrontSigner = new AWS.CloudFront.Signer(publicKeyId.Parameter.Value, config.frontendPrivateKey);
  }
  return globalThis.cloudFrontSigner;
}
