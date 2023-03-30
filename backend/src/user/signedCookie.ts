import { config } from "../config";
import Cloudfront from "aws-sdk/clients/cloudfront";
import { assertIsDefined } from "../util/assertions";
import { parameters } from "../aws/parameters";

function createStatementForDomain(domainName: string) {
  return {
    Resource: `https://${domainName}/*`,
    Condition: {
      DateLessThan: {
        "AWS:EpochTime": Math.floor(new Date().getTime() / 1000) + 3600,
      },
    },
  };
}

export async function createSignedCookies(): Promise<string[]> {
  const statements = [];
  if (config.frontendDomainName) {
    statements.push(createStatementForDomain(config.frontendDomainName));
  }
  if (config.frontendSecondaryDomainName) {
    statements.push(createStatementForDomain(config.frontendSecondaryDomainName));
  }
  const cloudFrontPolicy = JSON.stringify({
    Statement: statements,
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
    const frontendPrivateKey = await parameters.getRequiredInfraParameter("FrontendPrivateKey");
    assertIsDefined(config.frontendPublicKeyId, "config.frontendPublicKeyId puuttuu!");
    (globalThis as any).cloudFrontSigner = new Cloudfront.Signer(config.frontendPublicKeyId, frontendPrivateKey);
  }

  return (globalThis as any).cloudFrontSigner;
}
