/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { fileService } from "../../src/files/fileService";
import log from "loglevel";
import axios from "axios";
import * as fs from "fs";
import * as sinon from "sinon";

const { expect } = require("chai");

describe("UploadService", () => {
  after(() => {
    sinon.restore();
  });

  it("should upload file successfully", async function () {
    // Get pre-signed upload url
    const uploadProperties = await fileService.createUploadURLForFile("logo.png", "image/png");
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
    const url = "http://localhost:4566/" + process.env.YLLAPITO_BUCKET_NAME + "/yllapito/tiedostot/projekti/1/suunnittelusopimus/logo.png";
    log.info(url);
    const response = await axios.get(url);
    expect(response.status).to.be.eq(200);
    expect(response.headers["content-type"]).to.be.eq("image/png");
  });
});
