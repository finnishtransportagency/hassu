import { replaceFieldsByName } from "../../integrationtest/api/testFixtureRecorder";
import mocha from "mocha";
import fs from "fs";
import { mockClient } from "aws-sdk-client-mock";
import { GetObjectCommand, GetObjectCommandOutput, PutObjectCommand, PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import * as sinon from "sinon";

import { expect } from "chai";

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
  public s3Mock;

  constructor(mockLogo = false) {
    this.s3Mock = mockClient(S3Client);
    mocha.beforeEach(() => {
      this.s3Mock.reset();
      if (mockLogo) {
        this.mockGetLogo();
      }
      this.s3Mock.on(PutObjectCommand).callsFake((input: PutObjectCommandInput) => {
        try {
          const body = input.Body;
          const bucket = input.Bucket;
          const key = input.Key;
          let contents: Buffer;
          // body to buffer
          if (typeof body === "string") {
            contents = Buffer.from(body, "utf-8");
          } else if (body instanceof Readable) {
            contents = Buffer.from(body.read());
          } else if (body instanceof Uint8Array) {
            contents = Buffer.from(body);
          } else {
            throw new Error("Body type not supported");
          }
          const fullPath = ".report/" + bucket + "/" + key;
          const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(fullPath, contents);
        } catch (e) {
          console.error("Error in S3Mock", e);
        }
      });
    });

    mocha.afterEach(() => {
      this.s3Mock.reset();
    });
  }

  mockGetLogo(): void {
    this.s3Mock.on(GetObjectCommand).callsFake(() => {
      const body = fs.readFileSync(__dirname + "/../../integrationtest/files/logo.png");
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return {
        Body: Readable.from(body),
        ContentType: "image/png",
      } as GetObjectCommandOutput;
    });
  }

  mockGetObject(param: Partial<GetObjectCommandOutput>): void {
    this.s3Mock.on(GetObjectCommand).resolves(param);
  }
}
