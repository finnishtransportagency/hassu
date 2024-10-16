import { API } from "@services/api/commonApi";
import axios from "axios";
import { FileTypeNotAllowedError } from "common/error";
import { FileSizeExceededLimitError } from "common/error/FileSizeExceededLimitError";
import { maxFileSize, allowedFileTypes } from "common/fileValidationSettings";

export function splitFilePath(path?: string) {
  if (!path) {
    return {};
  }
  const fileName = path.replace(/.*\//, "").replace(/\.\w+$/, "");
  const fileExt = path.replace(/.*\./, "");
  const fileNameWithExt = fileName + "." + fileExt;
  return { path, fileName, fileExt, fileNameWithExt };
}

export async function lataaTiedosto(api: API, tiedosto: File): Promise<string> {
  validateTiedostoForUpload(tiedosto);
  return await lataaTiedostoInternal(api, tiedosto);
}

async function lataaTiedostoInternal(api: API, tiedosto: File): Promise<string> {
  const contentType = (tiedosto as Blob).type ?? "application/octet-stream";
  const response = await api.valmisteleTiedostonLataus(tiedosto.name, contentType);
  const url = response.latausLinkki;
  const fields = JSON.parse(response.latausKentat);

  const form = new FormData();
  Object.keys(fields).forEach((key) => {
    form.append(key, fields[key]);
  });
  form.append("file", tiedosto);

  await axios.post(url, form);
  return response.tiedostoPolku;
}

export function validateTiedostoForUpload(tiedosto: File) {
  if (tiedosto.size > maxFileSize) {
    throw new FileSizeExceededLimitError("Ladattavan tiedoston maksimikoko ylittyi", tiedosto);
  }
  if (!allowedFileTypes.includes(tiedosto.type)) {
    throw new FileTypeNotAllowedError("Ladattavan tiedosot väärä", tiedosto);
  }
}

export type LataaTiedostoResult = {
  name: string;
  path: string;
  size: number;
};

export async function lataaTiedostot(api: API, fileList: FileList | File[]): Promise<LataaTiedostoResult[]> {
  const tiedostot = Array.from(fileList);
  tiedostot.forEach((tiedosto) => validateTiedostoForUpload(tiedosto));
  return await Promise.all(
    tiedostot.map<Promise<LataaTiedostoResult>>(async (tiedosto) => ({
      name: tiedosto.name,
      path: await lataaTiedostoInternal(api, tiedosto),
      size: tiedosto.size,
    }))
  );
}
