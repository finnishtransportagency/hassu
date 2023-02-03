import { describe, it } from "mocha";
import {
  AloituskuulutusPdfOptions,
  HyvaksymisPaatosKuulutusAsiakirjaTyyppi,
  NahtavillaoloKuulutusAsiakirjaTyyppi,
  YleisotilaisuusKutsuPdfOptions,
} from "../../src/asiakirja/asiakirjaTypes";
import { AsiakirjaTyyppi, Kieli, ProjektiTyyppi, Viranomainen } from "../../../common/graphql/apiModel";
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
import { formatList } from "../../src/asiakirja/adapter/commonKutsuAdapter";
import { mockBankHolidays } from "../mocks";
import * as sinon from "sinon";
import { S3Mock } from "../aws/awsMock";

const { assert, expect } = require("chai");

async function runTestWithTypes<T>(types: T[], callback: (type: T) => Promise<void>) {
  for (const type of types) {
    await callback(type);
  }
}

describe("asiakirjaService", async () => {
  const projektiFixture = new ProjektiFixture();
  mockKirjaamoOsoitteet();
  mockBankHolidays();
  new S3Mock();

  after(() => {
    sinon.restore();
  });

  afterEach(() => {
    sinon.reset();
  });

  async function testKuulutusWithLanguage(
    aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu,
    kieli: Kieli,
    projekti: DBProjekti,
    asiakirjaTyyppi: AsiakirjaTyyppi
  ) {
    const aloituskuulutusPdfOptions: AloituskuulutusPdfOptions = {
      oid: projekti.oid,
      aloitusKuulutusJulkaisu,
      asiakirjaTyyppi,
      kieli,
      luonnos: true,
      kayttoOikeudet: projekti.kayttoOikeudet,
    };
    const pdf = await new AsiakirjaService().createAloituskuulutusPdf(aloituskuulutusPdfOptions);
    expect(pdf.sisalto.length).to.be.greaterThan(30000);
    expectPDF("esikatselu_aloituskuulutus_", pdf, asiakirjaTyyppi);
  }

  it("should generate kuulutus pdf succesfully", async () => {
    const projekti = projektiFixture.dbProjekti1(); // Suomi+Ruotsi
    const aloitusKuulutusJulkaisu = asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti);
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

    await assert.isRejected(testKuulutusWithLanguage(aloitusKuulutusJulkaisu, Kieli.SAAME, projekti, AsiakirjaTyyppi.ALOITUSKUULUTUS));
  });

  async function testKutsuWithLanguage(projekti: DBProjekti, vuorovaikutusKierros: VuorovaikutusKierros, kieli: Kieli) {
    const julkaisu: VuorovaikutusKierrosJulkaisu = await asiakirjaAdapter.adaptVuorovaikutusKierrosJulkaisu({
      ...projekti,
      vuorovaikutusKierros,
    });
    const velho: Velho = projekti.velho!;

    const options: YleisotilaisuusKutsuPdfOptions = {
      oid: projekti.oid,
      kayttoOikeudet: projekti.kayttoOikeudet,
      vuorovaikutusKierrosJulkaisu: julkaisu,
      velho,
      kielitiedot: projekti.kielitiedot!,
      suunnitteluSopimus: projekti.suunnitteluSopimus!,
      kieli,
      luonnos: true,
    };
    const pdf = await new AsiakirjaService().createYleisotilaisuusKutsuPdf(options);
    expectPDF("", pdf, AsiakirjaTyyppi.YLEISOTILAISUUS_KUTSU);

    if (kieli == Kieli.SUOMI) {
      const email = await new AsiakirjaEmailService().createYleisotilaisuusKutsuEmail(options);
      expect(email).toMatchSnapshot();
    }
  }

  it("should generate kutsu 20T/R pdf succesfully", async () => {
    const projekti: DBProjekti = projektiFixture.dbProjekti1(); // Suomi+Ruotsi
    projekti.velho!.suunnittelustaVastaavaViranomainen = Viranomainen.UUDENMAAN_ELY;
    projekti.velho!.tyyppi = ProjektiTyyppi.TIE;
    const originalNimi = projekti.velho!.nimi;
    projekti.velho!.nimi = originalNimi + " UUDENMAAN_ELY+TIE+SUOMI";
    await testKutsuWithLanguage(projekti, projektiFixture.vuorovaikutus, Kieli.SUOMI);
    projekti.velho!.nimi = originalNimi + " UUDENMAAN_ELY+TIE+RUOTSI";
    await testKutsuWithLanguage(projekti, projektiFixture.vuorovaikutus, Kieli.RUOTSI);

    projekti.velho!.suunnittelustaVastaavaViranomainen = Viranomainen.VAYLAVIRASTO;
    projekti.velho!.tyyppi = ProjektiTyyppi.RATA;

    projekti.velho!.nimi = originalNimi + " VAYLAVIRASTO+RATA+SUOMI";
    await testKutsuWithLanguage(projekti, projektiFixture.vuorovaikutus, Kieli.SUOMI);
    projekti.velho!.nimi = originalNimi + " VAYLAVIRASTO+RATA+RUOTSI";
    await testKutsuWithLanguage(projekti, projektiFixture.vuorovaikutus, Kieli.RUOTSI);
  });

  async function testNahtavillaoloKuulutusWithLanguage(
    projekti: DBProjekti,
    nahtavillaoloVaihe: NahtavillaoloVaihe,
    kieli: Kieli,
    asiakirjaTyyppi: NahtavillaoloKuulutusAsiakirjaTyyppi
  ) {
    const projektiToTestWith: DBProjekti = { ...projekti, nahtavillaoloVaihe };
    const pdf = await new AsiakirjaService().createNahtavillaoloKuulutusPdf({
      oid: projektiToTestWith.oid,
      velho: projektiToTestWith.velho as Velho,
      kayttoOikeudet: projektiToTestWith.kayttoOikeudet,
      suunnitteluSopimus: projektiToTestWith.suunnitteluSopimus as SuunnitteluSopimus,
      nahtavillaoloVaihe: asiakirjaAdapter.adaptNahtavillaoloVaiheJulkaisu(projektiToTestWith),
      kieli,
      luonnos: true,
      asiakirjaTyyppi,
    });
    expectPDF("esikatselu_nahtavillaolo_", pdf, asiakirjaTyyppi);
  }

  it("should generate kuulutukset for Nahtavillaolo succesfully", async () => {
    const projekti: DBProjekti = projektiFixture.dbProjekti2();
    projekti.velho!.tyyppi = ProjektiTyyppi.TIE;
    projekti.velho!.vaylamuoto = ["tie"];

    const nahtavillaoloKuulutusTypes: NahtavillaoloKuulutusAsiakirjaTyyppi[] = [
      AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS,
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE,
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
    ];

    await runTestWithTypes(
      nahtavillaoloKuulutusTypes,
      async (type) => await testNahtavillaoloKuulutusWithLanguage(projekti, projekti.nahtavillaoloVaihe!, Kieli.SUOMI, type)
    );

    projekti.velho!.tyyppi = ProjektiTyyppi.RATA;
    projekti.velho!.suunnittelustaVastaavaViranomainen = Viranomainen.VAYLAVIRASTO;
    projekti.velho!.vaylamuoto = ["rata"];
    await runTestWithTypes(
      nahtavillaoloKuulutusTypes,
      async (type) => await testNahtavillaoloKuulutusWithLanguage(projekti, projekti.nahtavillaoloVaihe!, Kieli.SUOMI, type)
    );

    projekti.velho!.tyyppi = ProjektiTyyppi.YLEINEN;
    projekti.velho!.vaylamuoto = ["rata"];
    await runTestWithTypes(
      nahtavillaoloKuulutusTypes,
      async (type) => await testNahtavillaoloKuulutusWithLanguage(projekti, projekti.nahtavillaoloVaihe!, Kieli.SUOMI, type)
    );
  });

  async function testHyvaksymisPaatosKuulutusWithLanguage(
    projekti: DBProjekti,
    hyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe,
    kieli: Kieli,
    asiakirjaTyyppi: HyvaksymisPaatosKuulutusAsiakirjaTyyppi
  ) {
    const projektiToTestWith = { ...projekti, hyvaksymisPaatosVaihe };
    const pdf = await new AsiakirjaService().createHyvaksymisPaatosKuulutusPdf({
      oid: projektiToTestWith.oid,
      kayttoOikeudet: projektiToTestWith.kayttoOikeudet,
      kasittelynTila: projektiToTestWith.kasittelynTila!,
      hyvaksymisPaatosVaihe: asiakirjaAdapter.adaptHyvaksymisPaatosVaiheJulkaisu(projekti, projekti.hyvaksymisPaatosVaihe),
      kieli,
      luonnos: true,
      asiakirjaTyyppi,
    });
    expectPDF("esikatselu_hyvaksymispaatos_", pdf, asiakirjaTyyppi);
  }

  it("should generate kuulutukset for Hyvaksymispaatos succesfully", async () => {
    const languages = [Kieli.SUOMI, Kieli.RUOTSI];
    for (const kieli of languages) {
      const projekti: DBProjekti = projektiFixture.dbProjekti2();
      // ----------
      projekti.velho!.tyyppi = ProjektiTyyppi.TIE;
      projekti.velho!.vaylamuoto = ["tie"];
      const hyvaksymisPaatosTypes: HyvaksymisPaatosKuulutusAsiakirjaTyyppi[] = [
        AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS,
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNILLE,
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE,
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE,
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE,
      ];
      await runTestWithTypes(
        hyvaksymisPaatosTypes,
        async (type) => await testHyvaksymisPaatosKuulutusWithLanguage(projekti, projekti.hyvaksymisPaatosVaihe!, kieli, type)
      );

      // ----------
      projekti.velho!.tyyppi = ProjektiTyyppi.RATA;
      projekti.velho!.suunnittelustaVastaavaViranomainen = Viranomainen.VAYLAVIRASTO;
      projekti.velho!.vaylamuoto = ["rata"];
      await runTestWithTypes(
        hyvaksymisPaatosTypes,
        async (type) => await testHyvaksymisPaatosKuulutusWithLanguage(projekti, projekti.hyvaksymisPaatosVaihe!, kieli, type)
      );

      // ----------
      projekti.velho!.tyyppi = ProjektiTyyppi.YLEINEN;
      projekti.velho!.vaylamuoto = ["rata"];
      await runTestWithTypes(
        hyvaksymisPaatosTypes,
        async (type) => await testHyvaksymisPaatosKuulutusWithLanguage(projekti, projekti.hyvaksymisPaatosVaihe!, kieli, type)
      );
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
});
