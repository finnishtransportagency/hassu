/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { fileService } from "../../src/files/fileService";
import * as sinon from "sinon";
import { uuid } from "../../src/util/uuid";
import { parseDate } from "../../src/util/dateUtil";
import { awsMockResolves, expectAwsCalls, S3Mock } from "../aws/awsMock";
import { ProjektiPaths } from "../../src/files/ProjektiPath";

const { expect } = require("chai");

describe("UploadService", () => {
  const s3Mock = new S3Mock();
  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  before(() => {
    sinon.stub(uuid, "v4").returns("1-2-3-4");
  });

  it("should upload file successfully", async function () {
    const uploadProperties = await fileService.createUploadURLForFile("logo ääkkösillä.png", "image/png");
    expect(uploadProperties.uploadURL).to.not.be.empty;
    expect(uploadProperties.fileNameWithPath).to.not.be.empty;

    // Mocking has to be done after getting the signed URL
    awsMockResolves(s3Mock.headObjectStub, { ContentType: "image/png" });

    await fileService.persistFileToProjekti({
      uploadedFileSource: uploadProperties.fileNameWithPath,
      oid: "1",
      targetFilePathInProjekti: "suunnittelusopimus",
    });

    expect(s3Mock.headObjectStub).to.be.calledOnce;
    expect(s3Mock.copyObjectStub).to.be.calledOnce;
    expect(s3Mock.headObjectStub.getCalls()[0].args[0]).toMatchSnapshot();
    expect(s3Mock.copyObjectStub.getCalls()[0].args[0]).toMatchSnapshot();
  });

  it("should create file to projekti successfully", async function () {
    const pathInProjekti = await fileService.createFileToProjekti({
      oid: "1",
      path: new ProjektiPaths("1"),
      fileName: "test ääkkösillä.pdf",
      contents: Buffer.from("foobar", "base64"),
      inline: true,
      contentType: "application/pdf",
      publicationTimestamp: parseDate("2000-01-01T12:34"),
    });
    expect(pathInProjekti).to.eq("/test ääkkösillä.pdf");

    expect(s3Mock.putObjectStub).to.be.calledOnce;
    expectAwsCalls(s3Mock.putObjectStub);
  });
});
