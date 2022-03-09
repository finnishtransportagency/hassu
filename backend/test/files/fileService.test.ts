/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { fileService } from "../../src/files/fileService";
import * as sinon from "sinon";
import { getS3Client } from "../../src/aws/clients";
import { uuid } from "../../src/util/uuid";
import { AwsClientStub, mockClient } from "aws-sdk-client-mock";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { parseDate } from "../../src/util/dateUtil";

const { expect } = require("chai");

const sandbox = sinon.createSandbox();

describe("UploadService", () => {
  let mockS3CLient: AwsClientStub<S3Client>;

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
    const uploadProperties = await fileService.createUploadURLForFile("logo ääkkösillä.png");
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

  it("should create file to projekti successfully", async function () {
    mockS3CLient = mockClient(getS3Client());
    mockS3CLient.on(PutObjectCommand).resolves({ $metadata: {} });

    const pathInProjekti = await fileService.createFileToProjekti({
      oid: "1",
      filePathInProjekti: "testfilepath",
      fileName: "test ääkkösillä.pdf",
      contents: Buffer.from("foobar", "base64"),
      inline: true,
      contentType: "application/pdf",
      publicationTimestamp: parseDate("2000-01-01T12:34"),
    });
    expect(pathInProjekti).to.eq("/testfilepath/test ääkkösillä.pdf");

    expect(mockS3CLient.send).to.be.calledOnce;
    expect((mockS3CLient.send.getCall(0).args as any)[0].input).toMatchSnapshot();
  });
});
