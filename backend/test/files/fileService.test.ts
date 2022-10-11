/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { fileService } from "../../src/files/fileService";
import * as sinon from "sinon";
import { uuid } from "../../src/util/uuid";
import { parseDate } from "../../src/util/dateUtil";
import { getS3 } from "../../src/aws/client";
import { awsMockResolves, expectAwsCalls } from "../aws/awsMock";

const { expect } = require("chai");

describe("UploadService", () => {
  let headObjectStub: sinon.SinonStub;
  let copyObjectStub: sinon.SinonStub;
  let putObjectStub: sinon.SinonStub;
  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  before(() => {
    sinon.stub(uuid, "v4").returns("1-2-3-4");
    let s3 = getS3();
    headObjectStub = sinon.stub(s3, "headObject");
    copyObjectStub = sinon.stub(s3, "copyObject");
    putObjectStub = sinon.stub(s3, "putObject");
  });

  it("should upload file successfully", async function () {
    const uploadProperties = await fileService.createUploadURLForFile("logo ääkkösillä.png", "image/png");
    expect(uploadProperties.uploadURL).to.not.be.empty;
    expect(uploadProperties.fileNameWithPath).to.not.be.empty;

    // Mocking has to be done after getting the signed URL
    awsMockResolves(headObjectStub, { ContentType: "image/png" });
    awsMockResolves(copyObjectStub);

    await fileService.persistFileToProjekti({
      uploadedFileSource: uploadProperties.fileNameWithPath,
      oid: "1",
      targetFilePathInProjekti: "suunnittelusopimus",
    });

    expect(headObjectStub).to.be.calledOnce;
    expect(copyObjectStub).to.be.calledOnce;
    expect(headObjectStub.getCalls()[0].args[0]).toMatchSnapshot();
    expect(copyObjectStub.getCalls()[0].args[0]).toMatchSnapshot();
  });

  it("should create file to projekti successfully", async function () {
    awsMockResolves(putObjectStub);

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

    expect(putObjectStub).to.be.calledOnce;
    expectAwsCalls(putObjectStub);
  });
});
