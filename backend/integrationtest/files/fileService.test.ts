/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { fileService } from "../../src/files/fileService";
import log from "loglevel";
import axios from "axios";
import { S3Client } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as sinon from "sinon";
import { SinonStub } from "sinon";
import { s3Client } from "../../src/aws/S3";

const { expect } = require("chai");

describe("UploadService", () => {
  before(() => {
    const stub: SinonStub = sinon.stub(s3Client, "get");
    stub.returns(
      new S3Client({
        endpoint: "http://localhost:4566",
        forcePathStyle: true,
      })
    );
  });

  after(() => {
    sinon.restore();
  });

  it("should upload file successfully", async function () {
    // Get pre-signed upload url
    const uploadProperties = await fileService.createUploadURLForFile("logo.png");
    expect(uploadProperties.uploadURL).to.not.be.empty;
    expect(uploadProperties.fileNameWithPath).to.not.be.empty;

    // Upload file
    log.info("Uploading to:", uploadProperties);
    const putResponse = await axios.put(uploadProperties.uploadURL, fs.readFileSync(__dirname + "/logo.png"), {
      headers: { "content-type": "image/png" },
    });
    expect(putResponse.status).to.be.eq(200);

    // Copy file from temporary upload location to projekti
    await fileService.persistFileToProjekti({
      uploadedFileSource: uploadProperties.fileNameWithPath,
      oid: "1",
      targetFilePathInProjekti: "suunnittelusopimus",
    });

    // Verify that the file is accessible
    const url = "http://localhost:4566/" + process.env.YLLAPITO_BUCKET_NAME + "/projekti/1/suunnittelusopimus/logo.png";
    log.info(url);
    const response = await axios.get(url);
    expect(response.status).to.be.eq(200);
    expect(response.headers["content-type"]).to.be.eq("image/png");
  });
});
