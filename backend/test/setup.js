const chai = require("chai");
const log = require("loglevel");

const { jestSnapshotPlugin } = require("mocha-chai-jest-snapshot");
chai.use(require("chai-as-promised"));
chai.use(jestSnapshotPlugin());

log.setLevel("INFO");
