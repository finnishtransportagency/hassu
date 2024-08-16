import { config } from "../config";
import { getSignedCookies } from "@aws-sdk/cloudfront-signer";
import { assertIsDefined } from "../util/assertions";
import { parameters } from "../aws/parameters";

export async function createSignedCookies(): Promise<string[]> {
  const cloudFrontPolicy = JSON.stringify({
    Statement: [
      {
        Resource: `*`,
        Condition: {
          DateLessThan: {
            "AWS:EpochTime": Math.floor(new Date().getTime() / 1000) + (3600 * 8),
          },
        },
      },
    ],
  });
  const frontendPrivateKey = await parameters.getRequiredInfraParameter("FrontendPrivateKey");
  // frontendPublicKeyId on us-east-1 regionilla ajetun cloudformationin tuottama arvo, joten sitä ei saa suoraan cachetetusta SSM:stä lambda-layerin kautta.
  // Tämän takia arvo kuljetetaan lambdan ENV-variablen kautta koodille
  assertIsDefined(config.frontendPublicKeyId, "config.frontendPublicKeyId puuttuu!");
  const cookie = getSignedCookies({
    url: "*",
    policy: cloudFrontPolicy,
    privateKey: frontendPrivateKey,
    keyPairId: config.frontendPublicKeyId,
  });

  const setCookieAttributes = `; Path=/; Secure; SameSite=None`;

  return [
    `CloudFront-Key-Pair-Id=${cookie["CloudFront-Key-Pair-Id"]}${setCookieAttributes}`,
    `CloudFront-Policy=${cookie["CloudFront-Policy"]}${setCookieAttributes}`,
    `CloudFront-Signature=${cookie["CloudFront-Signature"]}${setCookieAttributes}`,
  ];
}
