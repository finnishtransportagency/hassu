import { PDF } from "../../../common/graphql/apiModel";
import fs from "fs";
const { expect } = require("chai");

export function expectPDF(prefix: string, pdf: PDF & { textContent: string }) {
  fs.mkdirSync(".report", { recursive: true });
  const fileName = prefix + pdf.nimi;
  expect({ fileName, textContent: pdf.textContent }).toMatchSnapshot();
  fs.writeFileSync(".report/" + fileName, Buffer.from(pdf.sisalto, "base64"));
}

