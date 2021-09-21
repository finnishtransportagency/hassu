const chai = require("chai");

const { jestSnapshotPlugin } = require("mocha-chai-jest-snapshot");
chai.use(require("chai-as-promised"));
chai.use(jestSnapshotPlugin());
