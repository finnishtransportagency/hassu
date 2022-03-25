const AWSXRay = require("aws-xray-sdk-core");
const mocha = require("mocha");

const chai = require("chai");

const { jestSnapshotPlugin } = require("mocha-chai-jest-snapshot");
const AWS = require("aws-sdk");
chai.use(require("chai-as-promised"));
chai.use(jestSnapshotPlugin());

const dotenv = require("dotenv");
dotenv.config({ path: ".env.test" });

process.env.USE_PINO_PRETTY = "true";

process.env.TABLE_PROJEKTI = "Projekti-localstack";
process.env.TABLE_PROJEKTI_ARCHIVE = "Projekti-arkisto-localstack";
process.env.AWS_REGION = "eu-west-1";

process.env.UPLOAD_BUCKET_NAME = "hassu-localstack-upload";
process.env.YLLAPITO_BUCKET_NAME = "hassu-localstack-yllapito";
process.env.PUBLIC_BUCKET_NAME = "hassu-localstack-public";
process.env.INTERNAL_BUCKET_NAME = "hassu-localstack-internal";
process.env.ARCHIVE_BUCKET_NAME = "hassu-localstack-archive";
process.env.S3_ENDPOINT = "http://localhost:4566";

// Credentials must be test/test in order to get localstack pre-signed urls to work
process.env.AWS_SDK_LOAD_CONFIG = false;
process.env.AWS_ACCESS_KEY_ID = "test";
process.env.AWS_SECRET_ACCESS_KEY = "test";

process.env.PERSON_SEARCH_UPDATER_LAMBDA_ARN = "";
process.env.FRONTEND_DOMAIN_NAME = "localhost";

process.env.FRONTEND_PRIVATEKEY =
  "-----BEGIN RSA PRIVATE KEY-----\n" +
  "MIIEpQIBAAKCAQEA6v5JuDdJiKI3rgXF16aURXx467a2vOi7jwHE2tU2CAIAlva2\n" +
  "umLNCmKmPRxzi8LoNwZdRH5WThsxcyt/VJWEiXQQZRgVaDNKjtieWUjhtao6WXYw\n" +
  "bAxrsvGTiksYRDhHHiHlvLEZKZrkFVxfeuUsXkztwsWpAHrJkX2hH7MlDOJknkCL\n" +
  "TgjpjZcpeulBhQKfImNEnOMLa5YlDuBYCofLXyVKU8o6wzVjCVqDzQw6Xal7C5/T\n" +
  "PgM+vkl7szPU86YlY+NDPvYXe2Hgv5A9HlUw5XU/p2+v47+64g3cl1V7xaQ6n4JC\n" +
  "/GQOidUqUdqbLrON8XRqWJ9zbN4MtZH0/jOdqQIDAQABAoIBAQDb2AofzZl9ukVd\n" +
  "CQmONsmAOHLoEofjM9hEceM41z81PqpOkYFh3gz1KlVb1sJCfpXA5LNc4NTdPZOF\n" +
  "q6vz9e2IqoysB1v/n/ygpwd9gDGpQxhTmb6zVutq/ZaKSrbpG71s80l6vjRMOBwp\n" +
  "38Fzt/NKRa4qCcGSMU1iT6XtgiunYFqTT1siyl0fE10/L79Jur0AqnNxfYB4zY+2\n" +
  "YK94bcZdIR9JEE86RE5lc45skfYBk7FzuMn1o1Z6mU4bubGpK0d3z3xoWz5j9GAu\n" +
  "rADPrB1GJS0mm3VRdKZWN52GdmtX1lXXS0OGRUokGZtkyxBSaQAofdN7uHJpMv/F\n" +
  "0ZbIHjgBAoGBAP2UBfMoDU+bVC6CyCKUzr4PGszx1rMaQRvn3/qHkkDxGhOtE6Fy\n" +
  "Gxd/EgVXQv8wGgvK8tTqkG2XlWBVGk7UO9AB2YmyaPwzv9EAJsxuVTrQNzCV7buk\n" +
  "S6M3yRfQT2siyE52EoB//DgJT98UXYKgcLHLv6FRsUKkTYHgmQEokzG9AoGBAO08\n" +
  "04T3VFHj5XevY+7dhZ8XIG8AFo7fK1A3omluhy66CaAHP9msaVtmMyqvXv/F1k2N\n" +
  "MUdZ8KDtDQ5RxlyOuge93fMJPuphm+XqHeKK73kUbjZNEAAV288zw3vVXteodriq\n" +
  "GZoP4EmAo34E8aaYcYvoQNO+MiPQ9aYeYuu133xdAoGBALWNZ30ibfVTFsB+LmBj\n" +
  "/mmhUuTtOXTeFUOvjnNG4XXRqYPw5R8wHSmDdxmP0o32mI9c7ON4VZPBddeU1tMd\n" +
  "rP1OdbvamsQHIQy4eQ7g5/DF5t3IWn+AMA9Z/4YnRNVF//f9HV4XRDOypxbm89R0\n" +
  "nnsNj9QmMy2tiTi135YuwMRZAoGBANKJhaneGT2ng3CI/aXxf/ElBAqeSGa41WaW\n" +
  "SRNKHLwyK/KSHG8gHEwZ0dTS1/sjZsFiSVZqEiuu1ERd/C0OGThfnsZd8TDuOP18\n" +
  "nNL8u/N3VyvnjgiVXYJwDM8sF8RJ5DqT8q6P4ls4x19CIfbYGQSxtD5172drvWWU\n" +
  "V/OZb2GdAoGAMxAD+gDRK2v1JqUrQhCasglWVhumYKNfYtAsl4ifSIsI4cQqa554\n" +
  "G2xyz91BEf6u3+72fulLAXJnaX+yJthDCCY4dE4uPRjdd6HQU0rAMHCOd506RkmO\n" +
  "mPYHAj2MPodJgqSeM38QpmNhHZNK6sRGVf65alkjQZAM5kb/Ptpa0nc=\n" +
  "-----END RSA PRIVATE KEY-----\n";

AWS.config.update({
  region: "eu-west-1",
});

process.env.S3_ENDPOINT = "http://localhost:4566";

const ns = AWSXRay.getNamespace();
let context;

mocha.beforeEach(() => {
  context = ns.createContext();
  ns.enter(context);
  AWSXRay.setSegment(new AWSXRay.Segment("test"));
});

mocha.afterEach(() => {
  AWSXRay.getSegment()?.close();
  ns.exit(context);
});
