import { describe, it } from "mocha";
import { fileService } from "../../src/files/fileService";
import * as sinon from "sinon";
import { parseDate } from "../../src/util/dateUtil";
import { expectAwsCalls, S3Mock } from "../aws/awsMock";
import { ProjektiPaths } from "../../src/files/ProjektiPath";
import { CopyObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { expect } from "chai";
import { uuid } from "hassu-common/util/uuid";

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
    s3Mock.s3Mock.on(HeadObjectCommand).resolves({ ContentType: "image/png" });

    await fileService.persistFileToProjekti({
      uploadedFileSource: uploadProperties.fileNameWithPath,
      oid: "1",
      targetFilePathInProjekti: "suunnittelusopimus",
    });

    expectAwsCalls("HeadObjectCommand", s3Mock.s3Mock.commandCalls(HeadObjectCommand));
    expectAwsCalls("CopyObjectCommand", s3Mock.s3Mock.commandCalls(CopyObjectCommand));
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

    expect(s3Mock.s3Mock.commandCalls(PutObjectCommand).length).to.eq(1);
    expectAwsCalls("PutObjectCommand", s3Mock.s3Mock.commandCalls(PutObjectCommand));
  });
});
