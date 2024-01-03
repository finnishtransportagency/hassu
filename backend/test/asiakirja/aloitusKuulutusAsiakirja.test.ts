import { describe, it } from "mocha";
import { AloituskuulutusPdfOptions } from "../../src/asiakirja/asiakirjaTypes";
import { AsiakirjaTyyppi, Kieli, ProjektiTyyppi, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { asiakirjaAdapter } from "../../src/handler/asiakirjaAdapter";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { AloitusKuulutusJulkaisu, DBVaylaUser } from "../../src/database/model";
import * as sinon from "sinon";
import { AsiakirjaService } from "../../src/asiakirja/asiakirjaService";
import { expectPDF } from "./asiakirjaTestUtil";
import { assertIsDefined } from "../../src/util/assertions";
import { defaultUnitTestMocks } from "../mocks";
import { S3Mock } from "../aws/awsMock";
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";

import { expect } from "chai";
import { getLinkkiAsianhallintaan } from "../../src/asianhallinta/getLinkkiAsianhallintaan";
import { isProjektiAsianhallintaIntegrationEnabled } from "../../src/util/isProjektiAsianhallintaIntegrationEnabled";

const projektiFixture = new ProjektiFixture();

describe("aloitusKuulutusAsiakirja", () => {
  defaultUnitTestMocks();

  new S3Mock(true);

  afterEach(() => sinon.reset());
  after(() => sinon.restore());

  it("should generate kuulutus pdf succesfully SUOMI (tie) (suunnittelusopimus)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ALOITUSKUULUTUS, Kieli.SUOMI, true, ProjektiTyyppi.TIE));
  it("should generate kuulutus pdf succesfully SUOMI (yleis) (suunnittelusopimus)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ALOITUSKUULUTUS, Kieli.SUOMI, true, ProjektiTyyppi.YLEINEN));
  it("should generate kuulutus pdf succesfully SUOMI (tie)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ALOITUSKUULUTUS, Kieli.SUOMI, false, ProjektiTyyppi.TIE));
  it("should generate kuulutus pdf succesfully SUOMI (rata)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ALOITUSKUULUTUS, Kieli.SUOMI, false, ProjektiTyyppi.RATA));
  it("should generate kuulutus pdf succesfully SUOMI (tie, vähäinen menettely)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ALOITUSKUULUTUS, Kieli.SUOMI, false, ProjektiTyyppi.TIE, true));
  it("should generate kuulutus pdf succesfully SUOMI (rata, vähäinen menettely)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ALOITUSKUULUTUS, Kieli.SUOMI, false, ProjektiTyyppi.RATA, true));

  it("should generate ilmoitus pdf succesfully SUOMI (tie) (suunnittelusopimus)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, Kieli.SUOMI, true, ProjektiTyyppi.TIE));
  it("should generate ilmoitus pdf succesfully SUOMI (yleis) (suunnittelusopimus)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, Kieli.SUOMI, true, ProjektiTyyppi.YLEINEN));
  it("should generate ilmoitus pdf succesfully SUOMI (tie)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, Kieli.SUOMI, false, ProjektiTyyppi.TIE));
  it("should generate ilmoitus pdf succesfully SUOMI (rata)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, Kieli.SUOMI, false, ProjektiTyyppi.RATA));
  it("should generate ilmoitus pdf succesfully SUOMI (tie, vähäinen menettely)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, Kieli.SUOMI, false, ProjektiTyyppi.TIE, true));
  it("should generate ilmoitus pdf succesfully SUOMI (rata, vähäinen menettely)", async () =>
    doTestGenerateKuulutus(AsiakirjaTyyppi.ILMOITUS_KUULUTUKSESTA, Kieli.SUOMI, false, ProjektiTyyppi.RATA, true));
});

async function doTestGenerateKuulutus(
  asiakirjaTyyppi: AsiakirjaTyyppi,
  kieli: KaannettavaKieli,
  suunnitteluSopimus: boolean,
  projektiTyyppi: ProjektiTyyppi,
  vahainenMenettely?: boolean
): Promise<void> {
  const projekti = projektiFixture.dbProjekti1(); // Suomi+Ruotsi
  assertIsDefined(projekti.velho);
  projekti.velho.tyyppi = projektiTyyppi;
  if (projektiTyyppi == ProjektiTyyppi.RATA) {
    projekti.velho!.suunnittelustaVastaavaViranomainen = SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO;
    projekti.velho.vaylamuoto = ["rata"];
  } else {
    projekti.velho.vaylamuoto = ["tie"];
  }
  const aloitusKuulutusJulkaisu = await asiakirjaAdapter.adaptAloitusKuulutusJulkaisu(projekti);
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
    !!vahainenMenettely,
    await isProjektiAsianhallintaIntegrationEnabled(projekti),
    await getLinkkiAsianhallintaan(projekti),
    projektiTyyppi,
    suunnitteluSopimus ? "suunnittelusopimus" : "",
    vahainenMenettely ? "vahainen_menettely" : ""
  );
}

async function testKuulutusWithLanguage(
  oid: string,
  aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu,
  kieli: KaannettavaKieli,
  kayttoOikeudet: DBVaylaUser[],
  asiakirjaTyyppi: AsiakirjaTyyppi,
  vahainenMenettely: boolean,
  asianhallintaPaalla: boolean,
  linkkiAsianhallintaan: string | undefined,
  ...description: string[]
): Promise<void> {
  const aloituskuulutusPdfOptions: AloituskuulutusPdfOptions = {
    oid,
    lyhytOsoite: "ABCD",
    aloitusKuulutusJulkaisu,
    asiakirjaTyyppi,
    kieli,
    luonnos: true,
    kayttoOikeudet,
    vahainenMenettely,
    asianhallintaPaalla,
    linkkiAsianhallintaan,
  };
  const pdf = await new AsiakirjaService().createAloituskuulutusPdf(aloituskuulutusPdfOptions);
  expect(pdf.sisalto.length).to.be.greaterThan(30000);
  expectPDF("esikatselu_aloituskuulutus_" + description.filter((text) => !!text).join("_") + "_", pdf, asiakirjaTyyppi);
}
