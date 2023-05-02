import { replaceFieldsByName } from "../../integrationtest/api/testFixtureRecorder";
import mocha from "mocha";
import fs from "fs";
import { mockClient } from "aws-sdk-client-mock";
import { GetObjectCommand, GetObjectCommandOutput, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const { expect } = require("chai");

export function expectAwsCalls(stub: string, calls: sinon.SinonSpyCall[], ...cleanupFieldNames: string[]): void {
  if (calls.length == 0) {
    return;
  }
  const args = calls
    .map((call) => {
      const { input } = call.args[0];
      if (cleanupFieldNames) {
        replaceFieldsByName(input, "***unittest***", ...cleanupFieldNames.concat("Body"));
      }
      return input;
    })
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  expect({ stub, args: args.length == 1 ? args[0] : args }).toMatchSnapshot();
}

export class S3Mock {
  public s3Mock = mockClient(S3Client);

  constructor(mockLogo = false) {
    mocha.before(() => {
      this.s3Mock.reset();
    });

    if (mockLogo) {
      mocha.beforeEach(() => {
        this.mockGetLogo();
      });
    }
  }

  mockGetLogo() {
    const body = fs.readFileSync(__dirname + "/../../integrationtest/files/logo.png");
    this.s3Mock.on(GetObjectCommand).callsFake(async () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return {
        Body: Readable.from(body),
        ContentType: "image/png",
      } as GetObjectCommandOutput;
    });
  }

  mockGetObject(param: Partial<GetObjectCommandOutput>) {
    this.s3Mock.on(GetObjectCommand).resolves(param);
  }
}
