const chai = require("chai");
const log = require("loglevel");

const { jestSnapshotPlugin } = require("mocha-chai-jest-snapshot");
const AWS = require("aws-sdk");
chai.use(require("chai-as-promised"));
chai.use(jestSnapshotPlugin());

log.setLevel("INFO");
process.env.TABLE_PROJEKTI = "LocalProjekti";
process.env.AWS_REGION = "eu-west-1";



AWS.config.update({ region: "eu-west-1" });
