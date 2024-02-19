import AWSXRay from "aws-xray-sdk-core";
import mocha from "mocha";

import chai from "chai";

import { addSerializer, jestSnapshotPlugin } from "mocha-chai-jest-snapshot";

import chai_as_promised from "chai-as-promised";
// Serializer for Dayjs
import { isDayjs } from "dayjs";

import dotenv from "dotenv";

chai.use(chai_as_promised);
chai.use(jestSnapshotPlugin());

addSerializer({
  test: (val) => isDayjs(val),
  print: (val) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return `"${val.format()}"`;
  },
});
dotenv.config({ path: ".env.test" });

process.env.USE_PINO_PRETTY = "true";
process.env.VELHO_READ_ONLY = "true";

process.env.TABLE_PROJEKTI = "Projekti-localstack";
process.env.TABLE_LYHYTOSOITE = "Lyhytosoite-localstack";
process.env.TABLE_FEEDBACK = "Palaute-localstack";
process.env.TABLE_PROJEKTI_MUISTUTTAJA = "ProjektiMuistuttaja-localstack";
process.env.AWS_REGION = "eu-west-1";

process.env.UPLOAD_BUCKET_NAME = "hassu-localstack-upload";
process.env.YLLAPITO_BUCKET_NAME = "hassu-localstack-yllapito";
process.env.PUBLIC_BUCKET_NAME = "hassu-localstack-public";
process.env.INTERNAL_BUCKET_NAME = "hassu-localstack-internal";
process.env.S3_ENDPOINT = "http://localhost:4566";

process.env.AWS_SDK_LOAD_CONFIG = "true";

process.env.PERSON_SEARCH_UPDATER_LAMBDA_ARN = "";
process.env.FRONTEND_DOMAIN_NAME = "localhost:3000";
process.env.FRONTEND_API_DOMAIN_NAME = "localhost:3000";
process.env.CLOUDFRONT_DISTRIBUTION_ID = "unit-test-distribution-id";

process.env.FRONTEND_PUBLIC_KEY_ID = "test_public_key_id";

process.env.HASSU_XRAY_ENABLED = process.env.HASSU_XRAY_ENABLED || "false";

// Koodi säästetty jos halutaan tarvittaessa testeissä kytkeä X-Ray päälle
if (process.env.HASSU_XRAY_ENABLED !== "false") {
  const ns = AWSXRay.getNamespace();
  let context: Record<string, unknown>;

  mocha.beforeEach(() => {
    context = ns.createContext();
    ns.enter(context);
    AWSXRay.setSegment(new AWSXRay.Segment("test"));
  });

  mocha.afterEach(() => {
    AWSXRay.getSegment()?.close();
    ns.exit(context);
  });
}
process.setMaxListeners(50);
