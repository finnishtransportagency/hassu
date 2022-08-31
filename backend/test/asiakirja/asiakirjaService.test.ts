/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import {
  AsiakirjaService,
  HyvaksymisPaatosKuulutusAsiakirjaTyyppi,
  NahtavillaoloKuulutusAsiakirjaTyyppi,
} from "../../src/asiakirja/asiakirjaService";
import {
  AsiakirjaTyyppi,
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
  HyvaksymisPaatosVaihe,
  NahtavillaoloVaihe,
  SuunnitteluVaihe,
  Vuorovaikutus,
} from "../../src/database/model";
import { translate } from "../../src/util/localization";
import { formatList } from "../../src/asiakirja/suunnittelunAloitus/KutsuAdapter";
import sinon from "sinon";
import { kirjaamoOsoitteetService } from "../../src/kirjaamoOsoitteet/kirjaamoOsoitteetService";

const { assert, expect } = require("chai");

async function runTestWithTypes(types: AsiakirjaTyyppi[], callback: (type) => Promise<void>) {
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
    asiakirjaTyyppi: AsiakirjaTyyppi
  ) {
    const pdf = await new AsiakirjaService().createAloituskuulutusPdf({
      aloitusKuulutusJulkaisu,
      asiakirjaTyyppi,
      kieli,
      luonnos: true,
    });
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
      async (type) => await testKuulutusWithLanguage(aloitusKuulutusJulkaisu, Kieli.SUOMI, type)
    );

    await runTestWithTypes(
      aloitusKuulutusTypes,
      async (type) => await testKuulutusWithLanguage(aloitusKuulutusJulkaisu, Kieli.RUOTSI, type)
    );

    await assert.isRejected(
      testKuulutusWithLanguage(aloitusKuulutusJulkaisu, Kieli.SAAME, AsiakirjaTyyppi.ALOITUSKUULUTUS)
    );
  });

  async function testKutsuWithLanguage(
    projekti: DBProjekti,
    suunnitteluVaihe: SuunnitteluVaihe,
    vuorovaikutus: Vuorovaikutus,
    kieli: Kieli
  ) {
    const pdf = await new AsiakirjaService().createYleisotilaisuusKutsuPdf({
      projekti: { ...projekti, suunnitteluVaihe },
      vuorovaikutus,
      kieli,
      luonnos: true,
    });
    expectPDF("", pdf);

    const email = await new AsiakirjaService().createYleisotilaisuusKutsuEmail({
      projekti: { ...projekti, suunnitteluVaihe },
      vuorovaikutus,
      kieli,
      luonnos: true,
    });
    expect(email).toMatchSnapshot();
  }

  it("should generate kutsu 20T/R pdf succesfully", async () => {
    const projekti: DBProjekti = projektiFixture.dbProjekti1(); // Suomi+Ruotsi
    projekti.velho.suunnittelustaVastaavaViranomainen = Viranomainen.UUDENMAAN_ELY;
    projekti.velho.tyyppi = ProjektiTyyppi.TIE;
    const originalNimi = projekti.velho.nimi;
    projekti.velho.nimi = originalNimi + " UUDENMAAN_ELY+TIE+SUOMI";
    await testKutsuWithLanguage(
      projekti,
      { hankkeenKuvaus: projektiFixture.hankkeenKuvausSuunnitteluVaiheessa },
      projektiFixture.vuorovaikutus,
      Kieli.SUOMI
    );
    projekti.velho.nimi = originalNimi + " UUDENMAAN_ELY+TIE+RUOTSI";
    await testKutsuWithLanguage(
      projekti,
      { hankkeenKuvaus: projektiFixture.hankkeenKuvausSuunnitteluVaiheessa },
      projektiFixture.vuorovaikutus,
      Kieli.RUOTSI
    );

    projekti.velho.suunnittelustaVastaavaViranomainen = Viranomainen.VAYLAVIRASTO;
    projekti.velho.tyyppi = ProjektiTyyppi.RATA;

    projekti.velho.nimi = originalNimi + " VAYLAVIRASTO+RATA+SUOMI";
    await testKutsuWithLanguage(
      projekti,
      { hankkeenKuvaus: projektiFixture.hankkeenKuvausSuunnitteluVaiheessa },
      projektiFixture.vuorovaikutus,
      Kieli.SUOMI
    );
    projekti.velho.nimi = originalNimi + " VAYLAVIRASTO+RATA+RUOTSI";
    await testKutsuWithLanguage(
      projekti,
      { hankkeenKuvaus: projektiFixture.hankkeenKuvausSuunnitteluVaiheessa },
      projektiFixture.vuorovaikutus,
      Kieli.RUOTSI
    );
  });

  async function testNahtavillaoloKuulutusWithLanguage(
    projekti: DBProjekti,
    nahtavillaoloVaihe: NahtavillaoloVaihe,
    kieli: Kieli,
    asiakirjaTyyppi: NahtavillaoloKuulutusAsiakirjaTyyppi
  ) {
    const projektiToTestWith = { ...projekti, nahtavillaoloVaihe };
    const pdf = await new AsiakirjaService().createNahtavillaoloKuulutusPdf({
      projekti: projektiToTestWith,
      nahtavillaoloVaihe: asiakirjaAdapter.adaptNahtavillaoloVaiheJulkaisu(projektiToTestWith),
      kieli,
      luonnos: true,
      asiakirjaTyyppi,
    });
    expectPDF("esikatselu_nahtavillaolo_", pdf);
  }

  it("should generate kuulutukset for Nahtavillaolo succesfully", async () => {
    kirjaamoOsoitteetStub.resolves([
      {
        __typename: "KirjaamoOsoite",
        sahkoposti: "uudenmaan_kirjaamo@uudenmaan.ely",
        nimi: "UUDENMAAN_ELY",
      } as KirjaamoOsoite,
    ]);
    const projekti: DBProjekti = projektiFixture.dbProjekti2();
    projekti.velho.tyyppi = ProjektiTyyppi.TIE;
    projekti.velho.vaylamuoto = ["tie"];

    const nahtavillaoloKuulutusTypes = [
      AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS,
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE,
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
    ];

    await runTestWithTypes(
      nahtavillaoloKuulutusTypes,
      async (type) =>
        await testNahtavillaoloKuulutusWithLanguage(projekti, projekti.nahtavillaoloVaihe, Kieli.SUOMI, type)
    );

    projekti.velho.tyyppi = ProjektiTyyppi.RATA;
    projekti.velho.vaylamuoto = ["rata"];
    await runTestWithTypes(
      nahtavillaoloKuulutusTypes,
      async (type) =>
        await testNahtavillaoloKuulutusWithLanguage(projekti, projekti.nahtavillaoloVaihe, Kieli.SUOMI, type)
    );

    projekti.velho.tyyppi = ProjektiTyyppi.YLEINEN;
    projekti.velho.vaylamuoto = ["rata"];
    await runTestWithTypes(
      nahtavillaoloKuulutusTypes,
      async (type) =>
        await testNahtavillaoloKuulutusWithLanguage(projekti, projekti.nahtavillaoloVaihe, Kieli.SUOMI, type)
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
      projekti: projektiToTestWith,
      hyvaksymisPaatosVaihe: asiakirjaAdapter.adaptHyvaksymisPaatosVaiheJulkaisu(projekti),
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
      projekti.velho.tyyppi = ProjektiTyyppi.TIE;
      projekti.velho.vaylamuoto = ["tie"];
      const hyvaksymisPaatosTypes = [
        AsiakirjaTyyppi.HYVAKSYMISPAATOSKUULUTUS,
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNILLE,
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_TOISELLE_VIRANOMAISELLE,
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE,
        AsiakirjaTyyppi.ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE,
      ];
      await runTestWithTypes(
        hyvaksymisPaatosTypes,
        async (type) =>
          await testHyvaksymisPaatosKuulutusWithLanguage(projekti, projekti.hyvaksymisPaatosVaihe, kieli, type)
      );

      // ----------
      projekti.velho.tyyppi = ProjektiTyyppi.RATA;
      projekti.velho.vaylamuoto = ["rata"];
      await runTestWithTypes(
        hyvaksymisPaatosTypes,
        async (type) =>
          await testHyvaksymisPaatosKuulutusWithLanguage(projekti, projekti.hyvaksymisPaatosVaihe, kieli, type)
      );

      // ----------
      projekti.velho.tyyppi = ProjektiTyyppi.YLEINEN;
      projekti.velho.vaylamuoto = ["rata"];
      await runTestWithTypes(
        hyvaksymisPaatosTypes,
        async (type) =>
          await testHyvaksymisPaatosKuulutusWithLanguage(projekti, projekti.hyvaksymisPaatosVaihe, kieli, type)
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
