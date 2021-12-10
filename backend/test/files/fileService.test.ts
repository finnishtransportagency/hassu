/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { fileService } from "../../src/files/fileService";
import * as sinon from "sinon";
import { getS3Client } from "../../src/aws/clients";
import { uuid } from "../../src/util/uuid";
import { mockClient } from "aws-sdk-client-mock";
import { AwsStub } from "aws-sdk-client-mock/dist/types/awsClientStub";
import { HeadObjectCommand } from "@aws-sdk/client-s3";

const { expect } = require("chai");

const sandbox = sinon.createSandbox();

describe("UploadService", () => {
  let mockS3CLient: AwsStub<any, any>;

  afterEach(() => {
    sandbox.reset();
  });

  after(() => {
    sandbox.restore();
  });

  before(() => {
    sandbox.stub(uuid, "v4").returns("1-2-3-4");
  });

  it("should upload file successfully", async function () {
    const uploadProperties = await fileService.createUploadURLForFile("logo.png");
    expect(uploadProperties.uploadURL).to.not.be.empty;
    expect(uploadProperties.fileNameWithPath).to.not.be.empty;

    // Mocking has to be done after getting the signed URL
    mockS3CLient = mockClient(getS3Client());

    mockS3CLient.on(HeadObjectCommand).resolves({ ContentType: "image/png" });
    await fileService.persistFileToProjekti({
      uploadedFileSource: uploadProperties.fileNameWithPath,
      oid: "1",
      targetFilePathInProjekti: "suunnittelusopimus",
    });

    expect(mockS3CLient.send).to.be.calledTwice;
    expect((mockS3CLient.send.getCall(0).args as any)[0].input).toMatchSnapshot();
    expect((mockS3CLient.send.getCall(1).args as any)[0].input).toMatchSnapshot();
  });
});
