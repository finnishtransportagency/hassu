import { AsiakirjaTyyppi, IlmoitettavaViranomainen, KirjaamoOsoite, PDF } from "hassu-common/graphql/apiModel";
import fs from "fs";
import * as sinon from "sinon";
import mocha from "mocha";
import { kirjaamoOsoitteetService } from "../../src/kirjaamoOsoitteet/kirjaamoOsoitteetService";
import { expect } from "chai";

export function expectPDF(prefix: string, pdf: PDF & { textContent: string }, asiakirjaTyyppi: AsiakirjaTyyppi): void {
  const path = ".report/" + asiakirjaTyyppi;
  fs.mkdirSync(path, { recursive: true });
  const fileName = prefix + pdf.nimi;
  expect({ fileName, textContent: pdf.textContent }).toMatchSnapshot();
  fs.writeFileSync(path + "/" + fileName, new Uint8Array(Buffer.from(pdf.sisalto, "base64")));
}

export function mockKirjaamoOsoitteet(): void {
  let kirjaamoOsoitteetStub: sinon.SinonStub;
  mocha.before(() => {
    kirjaamoOsoitteetStub = sinon.stub(kirjaamoOsoitteetService, "listKirjaamoOsoitteet");
  });
  mocha.beforeEach(() => {
    const osoite: KirjaamoOsoite = {
      __typename: "KirjaamoOsoite",
      sahkoposti: "uudenmaan_kirjaamo@uudenmaan.ely",
      nimi: IlmoitettavaViranomainen.UUDENMAAN_ELY,
    };
    kirjaamoOsoitteetStub.resolves([osoite]);
  });
}
