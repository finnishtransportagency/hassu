import { describe, it } from "mocha";
import {
  AloituskuulutusPdfOptions,
  AsiakirjanMuoto,
  HyvaksymisPaatosKuulutusAsiakirjaTyyppi,
  NahtavillaoloKuulutusAsiakirjaTyyppi,
  YleisotilaisuusKutsuPdfOptions,
} from "../../src/asiakirja/asiakirjaTypes";
import {
  AsiakirjaTyyppi,
  IlmoitettavaViranomainen,
  Kieli,
  KirjaamoOsoite,
  PDF,
  ProjektiTyyppi,
  Viranomainen,
} from "../../../common/graphql/apiModel";
import fs from "fs";
import { asiakirjaAdapter } from "../../src/handler/asiakirjaAdapter";
import { ProjektiFixture } from "../fixture/projektiFixture";
import {
  AloitusKuulutusJulkaisu,
  DBProjekti,
  DBVaylaUser,
  HyvaksymisPaatosVaihe,
  NahtavillaoloVaihe,
  SuunnitteluSopimus,
  Velho,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
} from "../../src/database/model";
import { translate } from "../../src/util/localization";
import { formatList } from "../../src/asiakirja/suunnittelunAloitus/KutsuAdapter";
import sinon from "sinon";
import { kirjaamoOsoitteetService } from "../../src/kirjaamoOsoitteet/kirjaamoOsoitteetService";
import { determineAsiakirjaMuoto } from "../../src/asiakirja/asiakirjaTypes";
import { AsiakirjaEmailService } from "../../src/asiakirja/asiakirjaEmailService";
import { AsiakirjaService } from "../../src/asiakirja/asiakirjaService";

const { assert, expect } = require("chai");

async function runTestWithTypes<T>(types: T[], callback: (type: T) => Promise<void>) {
  for (const type of types) {
    await callback(type);
  }
}

function expectPDF(prefix: string, pdf: PDF & { textContent: string }) {
  fs.mkdirSync(".report", { recursive: true });
  const fileName = prefix + pdf.nimi;
  expect({ fileName, textContent: pdf.textContent }).toMatchSnapshot();
  fs.writeFileSync(".report/" + fileName, Buffer.from(pdf.sisalto, "base64"));
}

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
    kayttoOikeudet: DBVaylaUser[],
    asiakirjaTyyppi: AsiakirjaTyyppi
  ) {
    const aloituskuulutusPdfOptions: AloituskuulutusPdfOptions = {
      aloitusKuulutusJulkaisu,
      asiakirjaTyyppi,
      kieli,
      luonnos: true,
      kayttoOikeudet,
    };
    const pdf = await new AsiakirjaService().createAloituskuulutusPdf(aloituskuulutusPdfOptions);
    expect(pdf.sisalto.length).to.be.greaterThan(50000);
    expectPDF("esikatselu_aloituskuulutus_", pdf);
  }

  it("should generate kuulutus pdf succesfully", async () => {
    const projekti = projektiFixture.dbProjekti1(); // Suomi+Ruotsi
    const aloitusKuulutusJulkaisu = asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti);
    expect(aloitusKuulutusJulkaisu).toMatchSnapshot();
    const aloitusKuulutusTypes = [AsiakirjaTyyppi.ALOITUSKUULUTUS, AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA];

    await runTestWithTypes(
      aloitusKuulutusTypes,
      async (type) => await testKuulutusWithLanguage(aloitusKuulutusJulkaisu, Kieli.SUOMI, projekti.kayttoOikeudet, type)
    );

    await runTestWithTypes(
      aloitusKuulutusTypes,
      async (type) => await testKuulutusWithLanguage(aloitusKuulutusJulkaisu, Kieli.RUOTSI, projekti.kayttoOikeudet, type)
    );

    await assert.isRejected(
      testKuulutusWithLanguage(aloitusKuulutusJulkaisu, Kieli.SAAME, projekti.kayttoOikeudet, AsiakirjaTyyppi.ALOITUSKUULUTUS)
    );
  });

  async function testKutsuWithLanguage(projekti: DBProjekti, vuorovaikutusKierros: VuorovaikutusKierros, kieli: Kieli) {
    const julkaisu: VuorovaikutusKierrosJulkaisu = await asiakirjaAdapter.adaptVuorovaikutusKierrosJulkaisu({
      ...projekti,
      vuorovaikutusKierros,
    });
    const velho: Velho = projekti.velho!;
    const asiakirjanMuoto: AsiakirjanMuoto | undefined = determineAsiakirjaMuoto(velho?.tyyppi, velho?.vaylamuoto);

    const options: YleisotilaisuusKutsuPdfOptions = {
      oid: projekti.oid,
      kayttoOikeudet: projekti.kayttoOikeudet,
      vuorovaikutusKierrosJulkaisu: julkaisu,
      velho,
      kielitiedot: projekti.kielitiedot!,
      suunnitteluSopimus: projekti.suunnitteluSopimus!,
      asiakirjanMuoto,
      kieli,
      luonnos: true,
    };
    const pdf = await new AsiakirjaService().createYleisotilaisuusKutsuPdf(options);
    expectPDF("", pdf);

    const email = await new AsiakirjaEmailService().createYleisotilaisuusKutsuEmail(options);
    expect(email).toMatchSnapshot();
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
      velho: projektiToTestWith.velho as Velho,
      kayttoOikeudet: projektiToTestWith.kayttoOikeudet,
      suunnitteluSopimus: projektiToTestWith.suunnitteluSopimus as SuunnitteluSopimus,
      nahtavillaoloVaihe: asiakirjaAdapter.adaptNahtavillaoloVaiheJulkaisu(projektiToTestWith),
      kieli,
      luonnos: true,
      asiakirjaTyyppi,
    });
    expectPDF("esikatselu_nahtavillaolo_", pdf);
  }

  it("should generate kuulutukset for Nahtavillaolo succesfully", async () => {
    const osoite: KirjaamoOsoite = {
      __typename: "KirjaamoOsoite",
      sahkoposti: "uudenmaan_kirjaamo@uudenmaan.ely",
      nimi: IlmoitettavaViranomainen.UUDENMAAN_ELY,
    };
    kirjaamoOsoitteetStub.resolves([osoite]);
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
      suunnitteluSopimus: projektiToTestWith.suunnitteluSopimus!,
      kasittelynTila: projektiToTestWith.kasittelynTila!,
      hyvaksymisPaatosVaihe: asiakirjaAdapter.adaptHyvaksymisPaatosVaiheJulkaisu(projekti, projekti.hyvaksymisPaatosVaihe),
      kieli,
      luonnos: true,
      asiakirjaTyyppi,
    });
    expectPDF("esikatselu_hyvaksymispaatos_", pdf);
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
