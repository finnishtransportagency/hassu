const chai = require("chai");
const log = require("loglevel");

const { jestSnapshotPlugin } = require("mocha-chai-jest-snapshot");
const AWS = require("aws-sdk");
chai.use(require("chai-as-promised"));
chai.use(jestSnapshotPlugin());

process.env.TABLE_PROJEKTI = "Projekti-localstack";
process.env.AWS_REGION = "eu-west-1";



AWS.config.update({ region: "eu-west-1" });
