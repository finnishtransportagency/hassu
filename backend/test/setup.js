const chai = require("chai");

const { jestSnapshotPlugin } = require("mocha-chai-jest-snapshot");
const AWS = require("aws-sdk");
chai.use(require("chai-as-promised"));
chai.use(jestSnapshotPlugin());

process.env.TABLE_PROJEKTI = "Projekti-localstack";
process.env.AWS_REGION = "eu-west-1";

process.env.UPLOAD_BUCKET_NAME = "hassu-localstack-upload";
process.env.YLLAPITO_BUCKET_NAME = "hassu-localstack-yllapito";
process.env.S3_ENDPOINT = "http://localhost:4566";

// Credentials must be test/test in order to get localstack pre-signed urls to work
process.env.AWS_SDK_LOAD_CONFIG = false;
process.env.AWS_ACCESS_KEY_ID = "test";
process.env.AWS_SECRET_ACCESS_KEY = "test";

AWS.config.update({
  region: "eu-west-1",
});
