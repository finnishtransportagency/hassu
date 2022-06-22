/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import { AsiakirjaService } from "../../src/asiakirja/asiakirjaService";
import { AsiakirjaTyyppi, Kieli, KirjaamoOsoite, ProjektiTyyppi, Viranomainen } from "../../../common/graphql/apiModel";
import fs from "fs";
import { asiakirjaAdapter } from "../../src/handler/asiakirjaAdapter";
import { ProjektiFixture } from "../fixture/projektiFixture";
import {
  AloitusKuulutusJulkaisu,
  DBProjekti,
  NahtavillaoloVaihe,
  SuunnitteluVaihe,
  Vuorovaikutus,
} from "../../src/database/model";
import cloneDeep from "lodash/cloneDeep";
import { translate } from "../../src/util/localization";
import { formatList } from "../../src/asiakirja/suunnittelunAloitus/KutsuAdapter";
import sinon from "sinon";
import { kirjaamoOsoitteetService } from "../../src/kirjaamoOsoitteet/kirjaamoOsoitteetService";

const { assert, expect } = require("chai");

describe("asiakirjaService", async () => {
  const projektiFixture = new ProjektiFixture();
  let kirjaamoOsoitteetStub: sinon.SinonStub;
  before(() => {
    kirjaamoOsoitteetStub = sinon.stub(kirjaamoOsoitteetService, "listKirjaamoOsoitteet");
  });

  after(() => {
    kirjaamoOsoitteetStub.restore();
  });

  async function testKuulutusWithLanguage(
    aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu,
    kieli: Kieli,
    expectedFilename: string
  ) {
    const pdf = await new AsiakirjaService().createAloituskuulutusPdf({
      aloitusKuulutusJulkaisu,
      asiakirjaTyyppi: AsiakirjaTyyppi.ALOITUSKUULUTUS,
      kieli,
      luonnos: true,
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
    suunnitteluVaihe: SuunnitteluVaihe,
    vuorovaikutus: Vuorovaikutus,
    kieli: Kieli,
    expectedFilename: string
  ) {
    const pdf = await new AsiakirjaService().createYleisotilaisuusKutsuPdf({
      projekti: { ...projekti, suunnitteluVaihe },
      vuorovaikutus,
      kieli,
      luonnos: true,
    });
    // expect(pdf.sisalto.length).to.be.greaterThan(50000);
    expect(pdf.nimi).to.eq(expectedFilename);
    fs.mkdirSync(".report", { recursive: true });
    fs.writeFileSync(".report/" + pdf.nimi, Buffer.from(pdf.sisalto, "base64"));

    const email = await new AsiakirjaService().createYleisotilaisuusKutsuEmail({
      projekti: { ...projekti, suunnitteluVaihe },
      vuorovaikutus,
      kieli,
      luonnos: true,
    });
    expect(email).toMatchSnapshot();
  }

  it("should generate kutsu 20T/R pdf succesfully", async () => {
    const projekti: DBProjekti = cloneDeep(projektiFixture.dbProjekti1); // Suomi+Ruotsi
    projekti.velho.suunnittelustaVastaavaViranomainen = Viranomainen.UUDENMAAN_ELY;
    projekti.velho.tyyppi = ProjektiTyyppi.TIE;
    const originalNimi = projekti.velho.nimi;
    projekti.velho.nimi = originalNimi + " UUDENMAAN_ELY+TIE+SUOMI";
    await testKutsuWithLanguage(
      projekti,
      { hankkeenKuvaus: projektiFixture.hankkeenKuvausSuunnitteluVaiheessa },
      projektiFixture.vuorovaikutus,
      Kieli.SUOMI,
      "TS Tie Yleisotilaisuus kutsu.pdf"
    );
    projekti.velho.nimi = originalNimi + " UUDENMAAN_ELY+TIE+RUOTSI";
    await testKutsuWithLanguage(
      projekti,
      { hankkeenKuvaus: projektiFixture.hankkeenKuvausSuunnitteluVaiheessa },
      projektiFixture.vuorovaikutus,
      Kieli.RUOTSI,
      "TS Tie INBJUDAN TILL DISKUSSION.pdf"
    );

    projekti.velho.suunnittelustaVastaavaViranomainen = Viranomainen.VAYLAVIRASTO;
    projekti.velho.tyyppi = ProjektiTyyppi.RATA;

    projekti.velho.nimi = originalNimi + " VAYLAVIRASTO+RATA+SUOMI";
    await testKutsuWithLanguage(
      projekti,
      { hankkeenKuvaus: projektiFixture.hankkeenKuvausSuunnitteluVaiheessa },
      projektiFixture.vuorovaikutus,
      Kieli.SUOMI,
      "RS Rata Yleisotilaisuus kutsu.pdf"
    );
    projekti.velho.nimi = originalNimi + " VAYLAVIRASTO+RATA+RUOTSI";
    await testKutsuWithLanguage(
      projekti,
      { hankkeenKuvaus: projektiFixture.hankkeenKuvausSuunnitteluVaiheessa },
      projektiFixture.vuorovaikutus,
      Kieli.RUOTSI,
      "RS Rata INBJUDAN TILL DISKUSSION.pdf"
    );
  });

  async function testNahtavillaoloKuulutusWithLanguage(
    projekti: DBProjekti,
    nahtavillaoloVaihe: NahtavillaoloVaihe,
    kieli: Kieli,
    expectedFilename: string
  ) {
    const pdf = await new AsiakirjaService().createNahtavillaoloKuulutusPdf({
      projekti: { ...projekti, nahtavillaoloVaihe },
      nahtavillaoloVaihe,
      kieli,
      luonnos: true,
    });
    // expect(pdf.sisalto.length).to.be.greaterThan(50000);
    expect(pdf.nimi).to.eq(expectedFilename);
    fs.mkdirSync(".report", { recursive: true });
    fs.writeFileSync(".report/" + pdf.nimi, Buffer.from(pdf.sisalto, "base64"));
  }

  it("should generate kuulutus 30T/R pdf succesfully", async () => {
    kirjaamoOsoitteetStub.resolves([
      {
        __typename: "KirjaamoOsoite",
        sahkoposti: "uudenmaan_kirjaamo@uudenmaan.ely",
        nimi: "UUDENMAAN_ELY",
      } as KirjaamoOsoite,
    ]);
    const projekti: DBProjekti = cloneDeep(projektiFixture.dbProjekti2);
    const aloitusKuulutusJulkaisu = asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti);
    aloitusKuulutusJulkaisu.velho.suunnittelustaVastaavaViranomainen = Viranomainen.UUDENMAAN_ELY;
    await testNahtavillaoloKuulutusWithLanguage(
      projekti,
      projekti.nahtavillaoloVaihe,
      Kieli.SUOMI,
      "Nahtavillaolo_Testiprojekti 2.pdf"
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
    expect(translate("vaylavirasto", Kieli.SUOMI)).to.eq("Väylävirasto");
    expect(translate("viranomainen.PIRKANMAAN_ELY", Kieli.SUOMI)).to.eq("Pirkanmaan ELY-keskus");
  });
});
