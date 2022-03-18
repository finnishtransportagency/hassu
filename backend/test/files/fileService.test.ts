/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { fileService } from "../../src/files/fileService";
import * as sinon from "sinon";
import { uuid } from "../../src/util/uuid";
import { parseDate } from "../../src/util/dateUtil";
import AWSMock from "aws-sdk-mock";
import AWS from "aws-sdk";

const { expect } = require("chai");

const sandbox = sinon.createSandbox();

describe("UploadService", () => {
  let s3Stub: sinon.SinonStub;
  afterEach(() => {
    sandbox.reset();
    AWSMock.restore();
  });

  after(() => {
    sandbox.restore();
  });

  before(() => {
    sandbox.stub(uuid, "v4").returns("1-2-3-4");
  });

  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
    s3Stub = sinon.stub();
    AWSMock.mock("S3", "headObject", s3Stub);
    AWSMock.mock("S3", "copyObject", s3Stub);
  });

  it("should upload file successfully", async function () {
    const uploadProperties = await fileService.createUploadURLForFile("logo ääkkösillä.png");
    expect(uploadProperties.uploadURL).to.not.be.empty;
    expect(uploadProperties.fileNameWithPath).to.not.be.empty;

    // Mocking has to be done after getting the signed URL
    s3Stub.resolves({ ContentType: "image/png" });

    await fileService.persistFileToProjekti({
      uploadedFileSource: uploadProperties.fileNameWithPath,
      oid: "1",
      targetFilePathInProjekti: "suunnittelusopimus",
    });

    expect(s3Stub).to.be.calledTwice;
    expect(s3Stub.getCalls()[0].args[0].input).toMatchSnapshot();
    expect(s3Stub.getCalls()[1].args[0].input).toMatchSnapshot();
  });

  it("should create file to projekti successfully", async function () {
    const awsStub = sinon.stub();
    awsStub.resolves({});
    AWSMock.mock("S3", "putObject", awsStub);

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

    expect(awsStub).to.be.calledOnce;
    expect(awsStub.getCalls()[0].args[0].input).toMatchSnapshot();
  });
});
