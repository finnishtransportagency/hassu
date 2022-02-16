/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import { AsiakirjaService } from "../../src/asiakirja/asiakirjaService";
import { AsiakirjaTyyppi, Kieli } from "../../../common/graphql/apiModel";
import fs from "fs";
import { asiakirjaAdapter } from "../../src/handler/asiakirjaAdapter";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { AloitusKuulutusJulkaisu } from "../../src/database/model/projekti";

const { assert, expect } = require("chai");

describe("asiakirjaService", async () => {
  async function testKuulutusWithLanguage(
    aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu,
    kieli: Kieli,
    expectedFilename: string
  ) {
    const pdf = await new AsiakirjaService().createPdf({
      aloitusKuulutusJulkaisu,
      asiakirjaTyyppi: AsiakirjaTyyppi.ALOITUSKUULUTUS,
      kieli,
    });
    expect(pdf.sisalto.length).to.be.greaterThan(50000);
    expect(pdf.nimi).to.eq(expectedFilename);
    fs.mkdirSync(".report", { recursive: true });
    fs.writeFileSync(".report/unittest_" + pdf.nimi, Buffer.from(pdf.sisalto, "base64"));
  }

  it("should generate pdf succesfully", async () => {
    const projekti = new ProjektiFixture().dbProjekti1; // Suomi+Ruotsi
    const aloitusKuulutusJulkaisu = asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti);
    expect(aloitusKuulutusJulkaisu).toMatchSnapshot();

    await testKuulutusWithLanguage(
      aloitusKuulutusJulkaisu,
      Kieli.SUOMI,
      "KUULUTUS SUUNNITTELUN ALOITTAMISESTA Testiprojekti 1.pdf"
    );
    await testKuulutusWithLanguage(
      aloitusKuulutusJulkaisu,
      Kieli.RUOTSI,
      "KUNGORELSE OM INLEDANDET AV PLANERINGEN Namnet pa svenska.pdf"
    );
    await assert.isRejected(testKuulutusWithLanguage(aloitusKuulutusJulkaisu, Kieli.SAAME, "asd"));
  });
});
