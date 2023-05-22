import { fileService } from "../../src/files/fileService";
import { getAxios } from "../../src/aws/monitoring";
import { expect } from "chai";
import * as API from "../../../common/graphql/apiModel";
import FormData from "form-data";

export async function cleanProjektiS3Files(oid: string): Promise<void> {
  let files = await fileService.listYllapitoProjektiFiles(oid, "");
  for (const fileName in files) {
    await fileService.deleteYllapitoFileFromProjekti({ oid, filePathInProjekti: "/" + fileName, reason: "Alustetaan testit" });
  }

  files = await fileService.listPublicProjektiFiles(oid, "");
  for (const fileName in files) {
    await fileService.deletePublicFileFromProjekti({ oid, filePathInProjekti: "/" + fileName, reason: "Alustetaan testit" });
  }
}

export async function uploadFile(uploadProperties: API.LatausTiedot, file: Buffer): Promise<void> {
  await uploadFileWithProperties(
    {
      fileNameWithPath: uploadProperties.tiedostoPolku,
      uploadFields: uploadProperties.latausKentat,
      uploadURL: uploadProperties.latausLinkki,
    },
    file
  );
}

export async function uploadFileWithProperties(
  uploadProperties: { fileNameWithPath: string; uploadURL: string; uploadFields: string },
  file: Buffer
): Promise<void> {
  const form = new FormData();
  const fields = JSON.parse(uploadProperties.uploadFields);
  Object.keys(fields).forEach((fieldName) => {
    form.append(fieldName, fields[fieldName]);
  });
  const filename = fileService.getFileNameFromFilePath(fields["key"]);
  const fileContentType = fields["Content-Type"];
  form.append("file", file, { filename, contentType: fileContentType });

  const axios = getAxios();

  const lengthSync = form.getLengthSync();
  const postResponse = await axios.post(uploadProperties.uploadURL, form, {
    headers: {
      "Content-Length": lengthSync,
      ...form.getHeaders(),
    },
  });
  expect(postResponse.status).to.be.eq(204);
}
