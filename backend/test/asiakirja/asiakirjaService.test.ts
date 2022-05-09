/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import { AsiakirjaService } from "../../src/asiakirja/asiakirjaService";
import { AsiakirjaTyyppi, Kieli, ProjektiTyyppi, Viranomainen } from "../../../common/graphql/apiModel";
import fs from "fs";
import { asiakirjaAdapter } from "../../src/handler/asiakirjaAdapter";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { AloitusKuulutusJulkaisu, DBProjekti } from "../../src/database/model/projekti";
import { SuunnitteluVaihe, Vuorovaikutus } from "../../src/database/model/suunnitteluVaihe";
import { formatList } from "../../src/asiakirja/suunnittelunAloitus/kutsuPdf";
import { CommonPdf } from "../../src/asiakirja/suunnittelunAloitus/commonPdf";
import cloneDeep from "lodash/cloneDeep";

const { assert, expect } = require("chai");

describe("asiakirjaService", async () => {
  const projektiFixture = new ProjektiFixture();

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
    fs.writeFileSync(".report/" + pdf.nimi, Buffer.from(pdf.sisalto, "base64"));
  }

  it("should generate kuulutus pdf succesfully", async () => {
    const projekti = projektiFixture.dbProjekti1; // Suomi+Ruotsi
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

  async function testKutsuWithLanguage(
    projekti: DBProjekti,
    aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu,
    suunnitteluVaihe: SuunnitteluVaihe,
    vuorovaikutus: Vuorovaikutus,
    kieli: Kieli,
    expectedFilename: string
  ) {
    const pdf = await new AsiakirjaService().createPdf({
      projekti: { ...projekti, suunnitteluVaihe },
      aloitusKuulutusJulkaisu,
      vuorovaikutus,
      asiakirjaTyyppi: AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU,
      kieli,
    });
    // expect(pdf.sisalto.length).to.be.greaterThan(50000);
    expect(pdf.nimi).to.eq(expectedFilename);
    fs.mkdirSync(".report", { recursive: true });
    fs.writeFileSync(".report/" + pdf.nimi, Buffer.from(pdf.sisalto, "base64"));
  }

  it("should generate kutsu 20T/R pdf succesfully", async () => {
    const projekti: DBProjekti = cloneDeep(projektiFixture.dbProjekti1); // Suomi+Ruotsi
    const aloitusKuulutusJulkaisu = asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti);
    aloitusKuulutusJulkaisu.velho.suunnittelustaVastaavaViranomainen = Viranomainen.UUDENMAAN_ELY;
    expect(aloitusKuulutusJulkaisu).toMatchSnapshot();

    await testKutsuWithLanguage(
      projekti,
      aloitusKuulutusJulkaisu,
      { hankkeenKuvaus: projektiFixture.hankkeenKuvausSuunnitteluVaiheessa },
      projektiFixture.vuorovaikutus,
      Kieli.SUOMI,
      "20T TS Yleisotilaisuus kutsu Testiprojekti 1.pdf"
    );
    await testKutsuWithLanguage(
      projekti,
      aloitusKuulutusJulkaisu,
      { hankkeenKuvaus: projektiFixture.hankkeenKuvausSuunnitteluVaiheessa },
      projektiFixture.vuorovaikutus,
      Kieli.RUOTSI,
      "20T TS INBJUDAN TILL DISKUSSION Namnet pa svenska.pdf"
    );

    aloitusKuulutusJulkaisu.velho.suunnittelustaVastaavaViranomainen = Viranomainen.VAYLAVIRASTO;
    aloitusKuulutusJulkaisu.velho.tyyppi = ProjektiTyyppi.RATA;

    await testKutsuWithLanguage(
      projekti,
      aloitusKuulutusJulkaisu,
      { hankkeenKuvaus: projektiFixture.hankkeenKuvausSuunnitteluVaiheessa },
      projektiFixture.vuorovaikutus,
      Kieli.SUOMI,
      "20R Yleisotilaisuus kutsu Testiprojekti 1.pdf"
    );
    await testKutsuWithLanguage(
      projekti,
      aloitusKuulutusJulkaisu,
      { hankkeenKuvaus: projektiFixture.hankkeenKuvausSuunnitteluVaiheessa },
      projektiFixture.vuorovaikutus,
      Kieli.RUOTSI,
      "20R INBJUDAN TILL DISKUSSION Namnet pa svenska.pdf"
    );
  });

  it("should format list of words properly", () => {
    expect(formatList(["yksi"], Kieli.SUOMI)).to.eq("yksi");
    expect(formatList(["yksi", "kaksi"], Kieli.SUOMI)).to.eq("yksi ja kaksi");
    expect(formatList(["yksi", "kaksi", "kolme"], Kieli.SUOMI)).to.eq("yksi, kaksi ja kolme");
    expect(formatList(["yksi", "kaksi", "kolme", "neljä"], Kieli.SUOMI)).to.eq("yksi, kaksi, kolme ja neljä");
    expect(formatList(["yksi"], Kieli.RUOTSI)).to.eq("yksi");
    expect(formatList(["yksi", "kaksi"], Kieli.RUOTSI)).to.eq("yksi och kaksi");
    expect(formatList(["yksi", "kaksi", "kolme"], Kieli.RUOTSI)).to.eq("yksi, kaksi och kolme");
  });

  it("should find localization properly", () => {
    class TestPdf extends CommonPdf {
      testLocalization(key: string) {
        return this.getLocalization(key);
      }
    }

    const testPdf = new TestPdf("", "", Kieli.SUOMI);
    expect(testPdf.testLocalization("vaylavirasto")).to.eq("Väylävirasto");
    expect(testPdf.testLocalization("viranomainen.PIRKANMAAN_ELY")).to.eq("Pirkanmaan ELY-keskus");
  });
});
