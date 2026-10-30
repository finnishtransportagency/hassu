// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import sinon from "sinon";
import { expect } from "chai";
import { AsiakirjaTyyppi, Kieli, ProjektiTyyppi } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { lataaAsiakirja } from "../../src/handler/asiakirjaHandler";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { pdfGeneratorClient } from "../../src/asiakirja/lambda/pdfGeneratorClient";
import { parameters } from "../../src/aws/parameters";
import { userService } from "../../src/user";
import { UserFixture } from "../fixture/userFixture";
import { DBProjekti } from "../../src/database/model";
import { projektiAdapter } from "../../src/projekti/adapter/projektiAdapter";

const baseProjekti: DBProjekti = {
  oid: "1",
  versio: 1,
  salt: "salt",
  tallennettu: true,
  kayttoOikeudet: [],
  velho: { nimi: "Projekti 1", tyyppi: ProjektiTyyppi.TIE },
  nahtavillaoloVaihe: { id: 1 },
  kielitiedot: { ensisijainenKieli: Kieli.SUOMI },
};

const toiminnallinenProjekti: DBProjekti = {
  ...baseProjekti,
  velho: { nimi: "Projekti 1", tyyppi: ProjektiTyyppi.TOIMINNALLINEN },
};

const pdfResult = { __typename: "PDF" as const, nimi: "", sisalto: "", textContent: "" };

describe("lataaAsiakirja / handleNahtavillaoloKuulutus", () => {
  const userFixture = new UserFixture(userService);

  afterEach(() => {
    sinon.restore();
    userFixture.logout();
  });

  function setupCommonStubs(sandbox: sinon.SinonSandbox, projekti: DBProjekti) {
    userFixture.loginAs(UserFixture.hassuAdmin);
    sandbox.stub(parameters, "isAsianhallintaIntegrationEnabled").resolves(false);
    sandbox.stub(parameters, "isUspaIntegrationEnabled").resolves(false);
    sandbox.stub(projektiAdapter, "adaptProjektiToPreview").resolves(projekti as any);
    sandbox.stub(projektiDatabase, "loadProjektiByOid").resolves(projekti);
  }

  it("should throw IllegalArgumentError for toiminnallinen projekti + kiinteistonomistaja PDF esikatselu", async () => {
    setupCommonStubs(sinon, toiminnallinenProjekti);

    await expect(
      lataaAsiakirja({
        oid: "1",
        asiakirjaTyyppi: AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
        kieli: Kieli.SUOMI,
        muutokset: { oid: "1", versio: 1 },
      })
    ).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("should not throw for toiminnallinen projekti when asiakirjatyyppi is not kiinteistonomistaja", async () => {
    setupCommonStubs(sinon, toiminnallinenProjekti);
    sinon.stub(pdfGeneratorClient, "createNahtavillaoloKuulutusPdf").resolves(pdfResult);

    for (const tyyppi of [
      AsiakirjaTyyppi.NAHTAVILLAOLOKUULUTUS,
      AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KUNNILLE_VIRANOMAISELLE,
    ]) {
      await expect(lataaAsiakirja({ oid: "1", asiakirjaTyyppi: tyyppi, kieli: Kieli.SUOMI, muutokset: { oid: "1", versio: 1 } })).to
        .eventually.be.fulfilled;
    }
  });

  it("should not throw for non-toiminnallinen projekti when asiakirjatyyppi is kiinteistonomistaja", async () => {
    setupCommonStubs(sinon, baseProjekti);
    sinon.stub(pdfGeneratorClient, "createNahtavillaoloKuulutusPdf").resolves(pdfResult);

    await expect(
      lataaAsiakirja({
        oid: "1",
        asiakirjaTyyppi: AsiakirjaTyyppi.ILMOITUS_NAHTAVILLAOLOKUULUTUKSESTA_KIINTEISTOJEN_OMISTAJILLE,
        kieli: Kieli.SUOMI,
        muutokset: { oid: "1", versio: 1 },
      })
    ).to.eventually.be.fulfilled;
  });
});
