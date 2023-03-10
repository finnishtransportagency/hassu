import { describe, it } from "mocha";
import { AloituskuulutusPdfOptions } from "../../src/asiakirja/asiakirjaTypes";
import { AsiakirjaTyyppi, Kieli, ProjektiTyyppi, SuunnittelustaVastaavaViranomainen } from "../../../common/graphql/apiModel";
import { asiakirjaAdapter } from "../../src/handler/asiakirjaAdapter";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { AloitusKuulutusJulkaisu, DBVaylaUser } from "../../src/database/model";
import sinon from "sinon";
import { AsiakirjaService } from "../../src/asiakirja/asiakirjaService";
import { expectPDF, mockKirjaamoOsoitteet } from "./asiakirjaTestUtil";
import { assertIsDefined } from "../../src/util/assertions";
import { mockBankHolidays } from "../mocks";
import { S3Mock } from "../aws/awsMock";

const { assert, expect } = require("chai");

describe("aloitusKuulutusAsiakirja", async () => {
  const projektiFixture = new ProjektiFixture();
  mockBankHolidays();
  mockKirjaamoOsoitteet();
  new S3Mock();

  afterEach(() => sinon.reset());
  after(() => sinon.restore());

  async function testKuulutusWithLanguage(
    oid: string,
    aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu,
    kieli: Kieli,
    kayttoOikeudet: DBVaylaUser[],
    asiakirjaTyyppi: AsiakirjaTyyppi,
    ...description: string[]
  ) {
    const aloituskuulutusPdfOptions: AloituskuulutusPdfOptions = {
      oid,
      lyhytOsoite: "ABCD",
      aloitusKuulutusJulkaisu,
      asiakirjaTyyppi,
      kieli,
      luonnos: true,
      kayttoOikeudet,
    };
    const pdf = await new AsiakirjaService().createAloituskuulutusPdf(aloituskuulutusPdfOptions);
    expect(pdf.sisalto.length).to.be.greaterThan(30000);
    expectPDF("esikatselu_aloituskuulutus_" + description.join("_") + "_", pdf, asiakirjaTyyppi);
  }

  it("should generate kuulutus pdf succesfully SUOMI (tie) (suunnittelusopimus)", () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ALOITUSKUULUTUS, Kieli.SUOMI, true, ProjektiTyyppi.TIE));
  it("should generate kuulutus pdf succesfully SUOMI (yleis) (suunnittelusopimus)", () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ALOITUSKUULUTUS, Kieli.SUOMI, true, ProjektiTyyppi.YLEINEN));
  it("should generate kuulutus pdf succesfully SUOMI (tie)", () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ALOITUSKUULUTUS, Kieli.SUOMI, false, ProjektiTyyppi.TIE));
  it("should generate kuulutus pdf succesfully SUOMI (rata)", () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ALOITUSKUULUTUS, Kieli.SUOMI, false, ProjektiTyyppi.RATA));

  it("should generate ilmoitus pdf succesfully SUOMI (tie) (suunnittelusopimus)", () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, Kieli.SUOMI, true, ProjektiTyyppi.TIE));
  it("should generate ilmoitus pdf succesfully SUOMI (yleis) (suunnittelusopimus)", () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, Kieli.SUOMI, true, ProjektiTyyppi.YLEINEN));
  it("should generate ilmoitus pdf succesfully SUOMI (tie)", () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, Kieli.SUOMI, false, ProjektiTyyppi.TIE));
  it("should generate ilmoitus pdf succesfully SUOMI (rata)", () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, Kieli.SUOMI, false, ProjektiTyyppi.RATA));

  async function doTestGenerateKuulutus(
    asiakirjaTyyppi: AsiakirjaTyyppi,
    kieli: Kieli,
    suunnitteluSopimus: boolean,
    projektiTyyppi: ProjektiTyyppi
  ) {
    const projekti = projektiFixture.dbProjekti1(); // Suomi+Ruotsi
    assertIsDefined(projekti.velho);
    projekti.velho.tyyppi = projektiTyyppi;
    if (projektiTyyppi == ProjektiTyyppi.RATA) {
      projekti.velho!.suunnittelustaVastaavaViranomainen = SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO;
      projekti.velho.vaylamuoto = ["rata"];
    } else {
      projekti.velho.vaylamuoto = ["tie"];
    }
    const aloitusKuulutusJulkaisu = asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti);
    if (suunnitteluSopimus) {
      expect(aloitusKuulutusJulkaisu.suunnitteluSopimus).not.to.be.undefined;
    } else {
      aloitusKuulutusJulkaisu.suunnitteluSopimus = undefined;
    }

    await testKuulutusWithLanguage(
      projekti.oid,
      aloitusKuulutusJulkaisu,
      kieli,
      projekti.kayttoOikeudet,
      asiakirjaTyyppi,
      projektiTyyppi,
      suunnitteluSopimus ? "suunnittelusopimus" : ""
    );

    await assert.isRejected(
      testKuulutusWithLanguage(projekti.oid, aloitusKuulutusJulkaisu, Kieli.SAAME, projekti.kayttoOikeudet, AsiakirjaTyyppi.ALOITUSKUULUTUS)
    );
  }
});
