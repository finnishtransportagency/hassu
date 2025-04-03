import { describe, it } from "mocha";
import {
  AloituskuulutusPdfOptions,
  NahtavillaoloKuulutusAsiakirjaTyyppi,
  YleisotilaisuusKutsuPdfOptions,
} from "../../src/asiakirja/asiakirjaTypes";
import { AsiakirjaTyyppi, Kieli, ProjektiTyyppi, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { asiakirjaAdapter } from "../../src/handler/asiakirjaAdapter";
import { ProjektiFixture } from "../fixture/projektiFixture";
import {
  AloitusKuulutusJulkaisu,
  DBProjekti,
  HyvaksymisPaatosVaihe,
  NahtavillaoloVaihe,
  SuunnitteluSopimus,
  Velho,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
} from "../../src/database/model";
import { translate } from "../../src/util/localization";
import { AsiakirjaEmailService } from "../../src/asiakirja/asiakirjaEmailService";
import { AsiakirjaService } from "../../src/asiakirja/asiakirjaService";
import { expectPDF, mockKirjaamoOsoitteet } from "./asiakirjaTestUtil";
import { CommonKutsuAdapter, formatList } from "../../src/asiakirja/adapter/commonKutsuAdapter";
import { mockBankHolidays, mockParameters } from "../mocks";
import * as sinon from "sinon";
import { cleanupUrlsInPDF } from "../../commonTestUtil/cleanUpFunctions";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { S3Mock } from "../aws/awsMock";
import { expect } from "chai";
import { assertIsDefined } from "../../src/util/assertions";
import { mockUUID } from "../../integrationtest/shared/sharedMock";
import { HyvaksymisPaatosKuulutusAsiakirjaTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { getLinkkiAsianhallintaan } from "../../src/asianhallinta/getLinkkiAsianhallintaan";
import { isProjektiAsianhallintaIntegrationEnabled } from "../../src/util/isProjektiAsianhallintaIntegrationEnabled";
import { haeKuulutettuYhdessaSuunnitelmanimi } from "../../src/asiakirja/haeKuulutettuYhdessaSuunnitelmanimi";

async function runTestWithTypes<T>(types: T[], callback: (type: T) => Promise<void>) {
  for (const type of types) {
    await callback(type);
  }
}

describe("asiakirjaService", () => {
  const projektiFixture = new ProjektiFixture();
  mockKirjaamoOsoitteet();
  mockBankHolidays();
  mockUUID();
  mockParameters();

  new S3Mock(true);
  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  async function testKuulutusWithLanguage(
    aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu,
    kieli: KaannettavaKieli,
    projekti: DBProjekti,
    asiakirjaTyyppi: AsiakirjaTyyppi
  ) {
    const aloituskuulutusPdfOptions: AloituskuulutusPdfOptions = {
      oid: projekti.oid,
      lyhytOsoite: projekti.lyhytOsoite,
      aloitusKuulutusJulkaisu,
      asiakirjaTyyppi,
      kieli,
      luonnos: true,
      kayttoOikeudet: projekti.kayttoOikeudet,
      asianhallintaPaalla: await isProjektiAsianhallintaIntegrationEnabled(projekti),
      linkkiAsianhallintaan: await getLinkkiAsianhallintaan(projekti),
      kuulutettuYhdessaSuunnitelmanimi: await haeKuulutettuYhdessaSuunnitelmanimi(aloitusKuulutusJulkaisu.projektinJakautuminen, kieli),
    };
    const pdf = await new AsiakirjaService().createAloituskuulutusPdf(aloituskuulutusPdfOptions);
    expect(pdf.sisalto.length).to.be.greaterThan(30000);
    expectPDF("esikatselu_aloituskuulutus_", pdf, asiakirjaTyyppi);
  }

  it("should generate kuulutus pdf succesfully", async () => {
    const projekti = projektiFixture.dbProjekti1(); // Suomi+Ruotsi
    const aloitusKuulutusJulkaisu = await asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti);
    expect(aloitusKuulutusJulkaisu).toMatchSnapshot();
    const aloitusKuulutusTypes = [AsiakirjaTyyppi.ALOITUSKUULUTUS, AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA];

    await runTestWithTypes(
      aloitusKuulutusTypes,
      async (type) => await testKuulutusWithLanguage(aloitusKuulutusJulkaisu, Kieli.SUOMI, projekti, type)
    );

    await runTestWithTypes(
      aloitusKuulutusTypes,
      async (type) => await testKuulutusWithLanguage(aloitusKuulutusJulkaisu, Kieli.RUOTSI, projekti, type)
    );
  });

  async function testKutsuWithLanguage(projekti: DBProjekti, vuorovaikutusKierros: VuorovaikutusKierros, kieli: KaannettavaKieli) {
    const julkaisu: VuorovaikutusKierrosJulkaisu = await asiakirjaAdapter.adaptVuorovaikutusKierrosJulkaisu({
      ...projekti,
      vuorovaikutusKierros,
    });
    const velho = projekti.velho;
    assertIsDefined(velho);
    assertIsDefined(projekti.suunnitteluSopimus);

    const options: YleisotilaisuusKutsuPdfOptions = {
      oid: projekti.oid,
      lyhytOsoite: projekti.lyhytOsoite,
      kayttoOikeudet: projekti.kayttoOikeudet,
      vuorovaikutusKierrosJulkaisu: julkaisu,
      asianhallintaPaalla: await isProjektiAsianhallintaIntegrationEnabled(projekti),
      linkkiAsianhallintaan: await getLinkkiAsianhallintaan(projekti),
      velho,
      kielitiedot: projekti.kielitiedot,
      suunnitteluSopimus: projekti.suunnitteluSopimus,
      kieli,
      luonnos: true,
      kuulutettuYhdessaSuunnitelmanimi: await haeKuulutettuYhdessaSuunnitelmanimi(julkaisu.projektinJakautuminen, kieli),
    };
    const pdf = await new AsiakirjaService().createYleisotilaisuusKutsuPdf(options);
    expectPDF("", pdf, AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU);

    if (kieli == Kieli.SUOMI) {
      const email = new AsiakirjaEmailService().createYleisotilaisuusKutsuEmail(options);
      expect(email).toMatchSnapshot();
    }
  }

  it("should generate kutsu 20T/R pdf succesfully", async () => {
    const projekti: DBProjekti = projektiFixture.dbProjekti1(); // Suomi+Ruotsi
    assertIsDefined(projekti.velho);
    projekti.velho.suunnittelustaVastaavaViranomainen = SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY;
    projekti.velho.tyyppi = ProjektiTyyppi.TIE;
    const originalNimi = projekti.velho.nimi;
    projekti.velho.nimi = originalNimi + " UUDENMAAN_ELY+TIE+SUOMI";
    await testKutsuWithLanguage(projekti, projektiFixture.vuorovaikutus, Kieli.SUOMI);
    projekti.velho.nimi = originalNimi + " UUDENMAAN_ELY+TIE+RUOTSI";
    await testKutsuWithLanguage(projekti, projektiFixture.vuorovaikutus, Kieli.RUOTSI);

    projekti.velho.suunnittelustaVastaavaViranomainen = SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO;
    projekti.velho.tyyppi = ProjektiTyyppi.RATA;

    projekti.velho.nimi = originalNimi + " VAYLAVIRASTO+RATA+SUOMI";
    await testKutsuWithLanguage(projekti, projektiFixture.vuorovaikutus, Kieli.SUOMI);
    projekti.velho.nimi = originalNimi + " VAYLAVIRASTO+RATA+RUOTSI";
    await testKutsuWithLanguage(projekti, projektiFixture.vuorovaikutus, Kieli.RUOTSI);
  });

  async function testNahtavillaoloKuulutusWithLanguage(
    projekti: DBProjekti,
    nahtavillaoloVaihe: NahtavillaoloVaihe,
    kieli: KaannettavaKieli,
    asiakirjaTyyppi: NahtavillaoloKuulutusAsiakirjaTyyppi
  ) {
    const projektiToTestWith: DBProjekti = { ...projekti, nahtavillaoloVaihe };
    const julkaisu = await asiakirjaAdapter.adaptNahtavillaoloVaiheJulkaisu(projektiToTestWith);
    const pdf = await new AsiakirjaService().createNahtavillaoloKuulutusPdf({
      oid: projektiToTestWith.oid,
      lyhytOsoite: projekti.lyhytOsoite,
      velho: projektiToTestWith.velho as Velho,
      kayttoOikeudet: projektiToTestWith.kayttoOikeudet,
      suunnitteluSopimus: projektiToTestWith.suunnitteluSopimus as SuunnitteluSopimus,
      nahtavillaoloVaihe: julkaisu,
      kieli,
      luonnos: true,
      asiakirjaTyyppi,
      asianhallintaPaalla: await isProjektiAsianhallintaIntegrationEnabled(projekti),
      linkkiAsianhallintaan: await getLinkkiAsianhallintaan(projekti),
      kuulutettuYhdessaSuunnitelmanimi: await haeKuulutettuYhdessaSuunnitelmanimi(julkaisu.projektinJakautuminen, kieli),
    });
    pdf.textContent = cleanupUrlsInPDF(pdf.textContent);
    expectPDF("esikatselu_nahtavillaolo_", pdf, asiakirjaTyyppi);
  }

  it("should generate kuulutukset for Nahtavillaolo succesfully", async () => {
    const projekti: DBProjekti = projektiFixture.dbProjekti2();
    assertIsDefined(projekti.velho);
    assertIsDefined(projekti.kasittelynTila);
    projekti.velho.tyyppi = ProjektiTyyppi.TIE;
    projekti.velho.vaylamuoto = ["tie"];

    const nahtavillaoloKuulutusTypes: NahtavillaoloKuulutusAsiakirjaTyyppi[] = [
      AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS,
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE,
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
    ];

    for (const kieli of [Kieli.SUOMI, Kieli.RUOTSI]) {
      await expect(
        runTestWithTypes(nahtavillaoloKuulutusTypes, async (type) => {
          assertIsDefined(projekti.nahtavillaoloVaihe);
          await testNahtavillaoloKuulutusWithLanguage(projekti, projekti.nahtavillaoloVaihe, kieli as KaannettavaKieli, type);
        })
      ).to.eventually.be.fulfilled;

      projekti.velho.tyyppi = ProjektiTyyppi.RATA;
      projekti.velho.suunnittelustaVastaavaViranomainen = SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO;
      projekti.velho.vaylamuoto = ["rata"];
      await expect(
        runTestWithTypes(nahtavillaoloKuulutusTypes, async (type) => {
          assertIsDefined(projekti.nahtavillaoloVaihe);
          await testNahtavillaoloKuulutusWithLanguage(projekti, projekti.nahtavillaoloVaihe, kieli as KaannettavaKieli, type);
        })
      ).to.eventually.be.fulfilled;

      projekti.velho.tyyppi = ProjektiTyyppi.YLEINEN;
      projekti.velho.vaylamuoto = ["rata"];
      await expect(
        runTestWithTypes(nahtavillaoloKuulutusTypes, async (type) => {
          assertIsDefined(projekti.nahtavillaoloVaihe);
          await testNahtavillaoloKuulutusWithLanguage(projekti, projekti.nahtavillaoloVaihe, kieli as KaannettavaKieli, type);
        })
      ).to.eventually.be.fulfilled;
    }
  });

  async function testHyvaksymisPaatosKuulutusWithLanguage(
    projekti: DBProjekti,
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe,
    kieli: KaannettavaKieli,
    asiakirjaTyyppi: HyvaksymisPaatosKuulutusAsiakirjaTyyppi
  ) {
    const projektiToTestWith = { ...projekti, hyvaksymisPaatosVaihe };
    assertIsDefined(projektiToTestWith.kasittelynTila);
    const julkaisu = await asiakirjaAdapter.adaptHyvaksymisPaatosVaiheJulkaisu(
      projekti,
      projekti.hyvaksymisPaatosVaihe,
      projekti.hyvaksymisPaatosVaiheJulkaisut
    );
    const pdf = await new AsiakirjaService().createHyvaksymisPaatosKuulutusPdf({
      oid: projektiToTestWith.oid,
      lyhytOsoite: projekti.lyhytOsoite,
      kayttoOikeudet: projektiToTestWith.kayttoOikeudet,
      kasittelynTila: projektiToTestWith.kasittelynTila,
      hyvaksymisPaatosVaihe: julkaisu,
      kieli,
      luonnos: true,
      asiakirjaTyyppi,
      asianhallintaPaalla: await isProjektiAsianhallintaIntegrationEnabled(projekti),
      linkkiAsianhallintaan: await getLinkkiAsianhallintaan(projekti),
      kuulutettuYhdessaSuunnitelmanimi: await haeKuulutettuYhdessaSuunnitelmanimi(julkaisu.projektinJakautuminen, kieli),
    });
    expectPDF("esikatselu_hyvaksymispaatos_", pdf, asiakirjaTyyppi);
  }

  it("should generate kuulutukset for Hyvaksymispaatos succesfully", async () => {
    const languages = [Kieli.SUOMI, Kieli.RUOTSI];
    for (const kieli of languages) {
      const projekti: DBProjekti = projektiFixture.dbProjekti2();
      assertIsDefined(projekti.velho);
      // ----------
      projekti.velho.tyyppi = ProjektiTyyppi.TIE;
      projekti.velho.vaylamuoto = ["tie"];
      const hyvaksymisPaatosTypes: HyvaksymisPaatosKuulutusAsiakirjaTyyppi[] = [
        AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS,
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE,
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA,
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE,
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE,
      ];
      await expect(
        runTestWithTypes(hyvaksymisPaatosTypes, async (type) => {
          assertIsDefined(projekti.hyvaksymisPaatosVaihe);
          await testHyvaksymisPaatosKuulutusWithLanguage(projekti, projekti.hyvaksymisPaatosVaihe, kieli as KaannettavaKieli, type);
        })
      ).to.eventually.be.fulfilled;

      // ----------
      projekti.velho.tyyppi = ProjektiTyyppi.RATA;
      projekti.velho.suunnittelustaVastaavaViranomainen = SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO;
      projekti.velho.vaylamuoto = ["rata"];
      await expect(
        runTestWithTypes(hyvaksymisPaatosTypes, async (type) => {
          assertIsDefined(projekti.hyvaksymisPaatosVaihe);
          await testHyvaksymisPaatosKuulutusWithLanguage(projekti, projekti.hyvaksymisPaatosVaihe, kieli as KaannettavaKieli, type);
        })
      ).to.eventually.be.fulfilled;

      // ----------
      projekti.velho.tyyppi = ProjektiTyyppi.YLEINEN;
      projekti.velho.vaylamuoto = ["rata"];
      await expect(
        runTestWithTypes(hyvaksymisPaatosTypes, async (type) => {
          assertIsDefined(projekti.hyvaksymisPaatosVaihe);
          await testHyvaksymisPaatosKuulutusWithLanguage(projekti, projekti.hyvaksymisPaatosVaihe, kieli as KaannettavaKieli, type);
        })
      ).to.eventually.be.fulfilled;
    }
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

  it("should encode HTML successfully", () => {
    const adapter = new CommonKutsuAdapter({
      oid: "1",
      lyhytOsoite: "ABCD",
      kieli: Kieli.SUOMI,
      velho: {
        nimi: "foo",
        tyyppi: ProjektiTyyppi.TIE,
        suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      },
      kielitiedot: { ensisijainenKieli: Kieli.SUOMI },
      asianhallintaPaalla: false,
      linkkiAsianhallintaan: undefined,
    });
    expect(adapter.htmlText("asiakirja.tietosuoja")).toMatchSnapshot();
  });
});
