import { describe, it } from "mocha";
import { CreateNahtavillaoloKuulutusPdfOptions, NahtavillaoloKuulutusAsiakirjaTyyppi } from "../../src/asiakirja/asiakirjaTypes";
import { AsiakirjaTyyppi, Kieli, ProjektiTyyppi, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { asiakirjaAdapter } from "../../src/handler/asiakirjaAdapter";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { DBVaylaUser, NahtavillaoloVaiheJulkaisu, Velho } from "../../src/database/model";
import * as sinon from "sinon";
import { AsiakirjaService } from "../../src/asiakirja/asiakirjaService";
import { expectPDF, mockKirjaamoOsoitteet } from "./asiakirjaTestUtil";
import { assertIsDefined } from "../../src/util/assertions";
import { defaultUnitTestMocks } from "../mocks";
import { S3Mock } from "../aws/awsMock";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

import { expect } from "chai";
import { getLinkkiAsianhallintaan } from "../../src/asianhallinta/getLinkkiAsianhallintaan";

const projektiFixture = new ProjektiFixture();

describe("nahtavillaoloKuulutusAsiakirja", () => {
  defaultUnitTestMocks();

  new S3Mock(true);

  mockKirjaamoOsoitteet();

  afterEach(() => sinon.reset());
  after(() => sinon.restore());

  it("should generate kuulutus pdf succesfully SUOMI (tie) (suunnittelusopimus)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS, Kieli.SUOMI, true, ProjektiTyyppi.TIE));
  it("should generate kuulutus pdf succesfully SUOMI (yleis) (suunnittelusopimus)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS, Kieli.SUOMI, true, ProjektiTyyppi.YLEINEN));
  it("should generate kuulutus pdf succesfully SUOMI (tie)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS, Kieli.SUOMI, false, ProjektiTyyppi.TIE));
  it("should generate kuulutus pdf succesfully SUOMI (rata)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS, Kieli.SUOMI, false, ProjektiTyyppi.RATA));
  it("should generate kuulutus pdf succesfully SUOMI (tie, vähäinen menettely)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS, Kieli.SUOMI, false, ProjektiTyyppi.TIE, true));
  it("should generate kuulutus pdf succesfully SUOMI (rata, vähäinen menettely)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS, Kieli.SUOMI, false, ProjektiTyyppi.RATA, true));

  it("should generate ilmoitus kunnille/viranomaisille pdf succesfully SUOMI (tie) (suunnittelusopimus)", async () =>
    doTestGenerateKuulutus(
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE,
      Kieli.SUOMI,
      true,
      ProjektiTyyppi.TIE
    ));
  it("should generate ilmoitus kunnille/viranomaisille pdf succesfully SUOMI (yleis) (suunnittelusopimus)", async () =>
    doTestGenerateKuulutus(
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE,
      Kieli.SUOMI,
      true,
      ProjektiTyyppi.YLEINEN
    ));
  it("should generate ilmoitus kunnille/viranomaisille pdf succesfully SUOMI (tie)", async () =>
    doTestGenerateKuulutus(
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE,
      Kieli.SUOMI,
      false,
      ProjektiTyyppi.TIE
    ));
  it("should generate ilmoitus kunnille/viranomaisille pdf succesfully SUOMI (rata)", async () =>
    doTestGenerateKuulutus(
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE,
      Kieli.SUOMI,
      false,
      ProjektiTyyppi.RATA
    ));
  it("should generate ilmoitus kunnille/viranomaisille pdf succesfully SUOMI (tie, vähäinen menettely)", async () =>
    doTestGenerateKuulutus(
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE,
      Kieli.SUOMI,
      false,
      ProjektiTyyppi.TIE,
      true
    ));
  it("should generate ilmoitus kunnille/viranomaisille pdf succesfully SUOMI (rata, vähäinen menettely)", async () =>
    doTestGenerateKuulutus(
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE,
      Kieli.SUOMI,
      false,
      ProjektiTyyppi.RATA,
      true
    ));

  it("should generate ilmoitus kiinteistöjen omistajille pdf succesfully SUOMI (tie) (suunnittelusopimus)", async () =>
    doTestGenerateKuulutus(
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
      Kieli.SUOMI,
      true,
      ProjektiTyyppi.TIE
    ));
  it("should generate ilmoitus kiinteistöjen omistajille pdf succesfully SUOMI (yleis) (suunnittelusopimus)", async () =>
    doTestGenerateKuulutus(
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
      Kieli.SUOMI,
      true,
      ProjektiTyyppi.YLEINEN
    ));
  it("should generate ilmoitus kiinteistöjen omistajille pdf succesfully SUOMI (tie)", async () =>
    doTestGenerateKuulutus(
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
      Kieli.SUOMI,
      false,
      ProjektiTyyppi.TIE
    ));
  it("should generate ilmoitus kiinteistöjen omistajille pdf succesfully SUOMI (rata)", async () =>
    doTestGenerateKuulutus(
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
      Kieli.SUOMI,
      false,
      ProjektiTyyppi.RATA
    ));
  it("should generate ilmoitus kiinteistöjen omistajille pdf succesfully SUOMI (tie, vähäinen menettely)", async () =>
    doTestGenerateKuulutus(
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
      Kieli.SUOMI,
      false,
      ProjektiTyyppi.TIE,
      true
    ));
  it("should generate ilmoitus kiinteistöjen omistajille pdf succesfully SUOMI (rata, vähäinen menettely)", async () =>
    doTestGenerateKuulutus(
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
      Kieli.SUOMI,
      false,
      ProjektiTyyppi.RATA,
      true
    ));
});

async function doTestGenerateKuulutus(
  asiakirjaTyyppi: NahtavillaoloKuulutusAsiakirjaTyyppi,
  kieli: KaannettavaKieli,
  suunnitteluSopimus: boolean,
  projektiTyyppi: ProjektiTyyppi,
  vahainenMenettely?: boolean
): Promise<void> {
  const projekti1 = projektiFixture.dbProjekti1(); // Suomi+Ruotsi
  const nahtavillaoloVaihe = projektiFixture.dbProjekti2().nahtavillaoloVaihe;
  const projekti = { ...projekti1, nahtavillaoloVaihe };
  assertIsDefined(projekti.velho);
  projekti.velho.tyyppi = projektiTyyppi;
  if (projektiTyyppi == ProjektiTyyppi.RATA) {
    projekti.velho!.suunnittelustaVastaavaViranomainen = SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO;
    projekti.velho.vaylamuoto = ["rata"];
  } else {
    projekti.velho.vaylamuoto = ["tie"];
  }
  const nahtavillaoloVaiheJulkaisu = await asiakirjaAdapter.adaptNahtavillaoloVaiheJulkaisu(projekti);
  if (suunnitteluSopimus) {
    expect(projekti.suunnitteluSopimus).not.to.be.undefined;
  } else {
    projekti.suunnitteluSopimus = undefined;
  }

  await testKuulutusWithLanguage(
    projekti.oid,
    nahtavillaoloVaiheJulkaisu,
    kieli,
    projekti.kayttoOikeudet,
    asiakirjaTyyppi,
    !!vahainenMenettely,
    projekti.velho,
    await getLinkkiAsianhallintaan(projekti),
    projektiTyyppi,
    suunnitteluSopimus ? "suunnittelusopimus" : ""
  );
}

async function testKuulutusWithLanguage(
  oid: string,
  nahtavillaoloVaiheJulkaisu: NahtavillaoloVaiheJulkaisu,
  kieli: KaannettavaKieli,
  kayttoOikeudet: DBVaylaUser[],
  asiakirjaTyyppi: NahtavillaoloKuulutusAsiakirjaTyyppi,
  vahainenMenettely: boolean,
  velho: Velho,
  linkkiAsianhallintaan: string | undefined,
  ...description: string[]
): Promise<void> {
  const nahtavillaoloKuulutusPdfOptions: CreateNahtavillaoloKuulutusPdfOptions = {
    oid,
    lyhytOsoite: "ABCD",
    nahtavillaoloVaihe: nahtavillaoloVaiheJulkaisu,
    kieli,
    luonnos: true,
    kayttoOikeudet,
    vahainenMenettely,
    velho,
    asiakirjaTyyppi,
    linkkiAsianhallintaan,
  };
  const pdf = await new AsiakirjaService().createNahtavillaoloKuulutusPdf(nahtavillaoloKuulutusPdfOptions);
  expect(pdf.sisalto.length).to.be.greaterThan(30000);
  expectPDF("esikatselu_aloituskuulutus_" + description.join("_") + "_", pdf, asiakirjaTyyppi);
}
