import mocha from "mocha";
import { mockClient } from "aws-sdk-client-mock";
import { PutObjectCommand, PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import fs from "fs";
import { Readable } from "stream";

export class S3Mock {
  public s3Mock;

  constructor() {
    this.s3Mock = mockClient(S3Client);
    mocha.beforeEach(() => {
      this.s3Mock.reset();
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
}
