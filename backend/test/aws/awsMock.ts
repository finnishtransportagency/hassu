import * as sinon from "sinon";
import { replaceFieldsByName } from "../../integrationtest/api/testFixtureRecorder";
import mocha from "mocha";
import { getS3 } from "../../src/aws/client";
import fs from "fs";

const { expect } = require("chai");

export function awsMockResolves<T>(stub: sinon.SinonStub, returnValue?: T): void {
  stub.returns({
    promise() {
      return returnValue;
    },
  });
}

export function expectAwsCalls(stub: sinon.SinonStub, ...cleanupFieldNames: string[]): void {
  const calls = stub.getCalls();
  if (calls.length == 0) {
    return;
  }
  const args = calls
    .map((call) => {
      const { Body: _Body, ...rest } = call.args[0];
      if (cleanupFieldNames) {
        replaceFieldsByName(rest, "***unittest***", ...cleanupFieldNames);
      }
      return rest;
    })
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  expect({ stub: stub.toString(), args: args.length == 1 ? args[0] : args }).toMatchSnapshot();
}

export class S3Mock {
  public putObjectStub!: sinon.SinonStub;
  public copyObjectStub!: sinon.SinonStub;
  public getObjectStub!: sinon.SinonStub;
  public headObjectStub!: sinon.SinonStub;
  public deleteObjectStub!: sinon.SinonStub;
  public listObjectsV2Stub!: sinon.SinonStub;

  constructor() {
    mocha.before(() => {
      const s3 = getS3();
      this.putObjectStub = sinon.stub(s3, "putObject");
      this.copyObjectStub = sinon.stub(s3, "copyObject");
      this.getObjectStub = sinon.stub(s3, "getObject");
      this.headObjectStub = sinon.stub(s3, "headObject");
      this.deleteObjectStub = sinon.stub(s3, "deleteObject");
      this.listObjectsV2Stub = sinon.stub(s3, "listObjectsV2");
    });
    mocha.beforeEach(() => {
      awsMockResolves(this.getObjectStub, {
        Body: fs.readFileSync(__dirname + "/../../integrationtest/files/logo.png"),
        ContentType: "image/png",
      });
      awsMockResolves(this.putObjectStub);
      awsMockResolves(this.copyObjectStub);
      awsMockResolves(this.headObjectStub);
      awsMockResolves(this.deleteObjectStub);
      awsMockResolves(this.listObjectsV2Stub);
    });
  }
}
