import { API } from "@services/api/commonApi";
import axios from "axios";

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
  const contentType = (tiedosto as Blob).type || "application/octet-stream";
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
