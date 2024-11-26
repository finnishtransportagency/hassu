import { describe, it } from "mocha";
import { ProjektiFixture } from "../../../fixture/projektiFixture";
import * as sinon from "sinon";
import { UserFixture } from "../../../fixture/userFixture";
import { userService } from "../../../../src/user";
import { personSearch } from "../../../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../../../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../../../src/personSearch/kayttajas";
import { validateTallennaProjekti } from "../../../../src/projekti/validator/projektiValidator";
import { VuorovaikutusKierrosTila } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import dayjs from "dayjs";

import { expect } from "chai";
import { parameters } from "../../../../src/aws/parameters";

const ELY_UID = "A1";
const VAYLA_UID = "A2";

describe("projektiValidator (vuorovaikutusKierrosValidator)", () => {
  let fixture: ProjektiFixture;
  const userFixture = new UserFixture(userService);
  let isUspaIntegrationEnabledStub: sinon.SinonStub;

  before(() => {
    const personSearchFixture = new PersonSearchFixture();
    const elyUser = personSearchFixture.createKayttaja(ELY_UID, "ELY");
    const vaylaUser = personSearchFixture.createKayttaja(VAYLA_UID);
    const kayttaja1 = personSearchFixture.createKayttaja("A123");
    const kayttaja2 = personSearchFixture.createKayttaja("A000111");
    const kayttaja3 = personSearchFixture.createKayttaja("A000123");

    fixture = new ProjektiFixture();
    sinon.stub(personSearch, "getKayttajas").resolves(Kayttajas.fromKayttajaList([elyUser, vaylaUser, kayttaja1, kayttaja2, kayttaja3]));
    isUspaIntegrationEnabledStub = sinon.stub(parameters, "isUspaIntegrationEnabled");
    isUspaIntegrationEnabledStub.returns(Promise.resolve(true));
  });

  afterEach(() => {
    sinon.reset();
    userFixture.logout();
  });

  after(() => {
    sinon.restore();
  });

  it("ei anna luoda uutta vuorovaikutuskierrosta niin, että se on edellistä aiemmin", async () => {
    const projekti = fixture.dbProjektiLackingNahtavillaoloVaihe();
    const aiempiJulkaisuPaiva = projekti.vuorovaikutusKierrosJulkaisut?.[0]?.vuorovaikutusJulkaisuPaiva;
    projekti.vuorovaikutusKierros = {
      vuorovaikutusNumero: 2,
      tila: VuorovaikutusKierrosTila.MUOKATTAVISSA,
    };
    const projektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 2,
        vuorovaikutusJulkaisuPaiva: dayjs(aiempiJulkaisuPaiva).subtract(1, "day").format("YYYY-MM-DD"),
      },
    };
    userFixture.loginAs(UserFixture.pekkaProjari);
    await expect(validateTallennaProjekti(projekti, projektiInput)).eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("antaa luoda uuden vuorovaikutuskierroksen niin, että se on edellistä myöhemmin", async () => {
    const projekti = fixture.dbProjektiLackingNahtavillaoloVaihe();
    const aiempiJulkaisuPaiva = projekti.vuorovaikutusKierrosJulkaisut?.[0]?.vuorovaikutusJulkaisuPaiva;
    projekti.vuorovaikutusKierros = {
      vuorovaikutusNumero: 2,
      tila: VuorovaikutusKierrosTila.MUOKATTAVISSA,
    };
    const projektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 2,
        vuorovaikutusJulkaisuPaiva: dayjs(aiempiJulkaisuPaiva).add(1, "day").format("YYYY-MM-DD"),
      },
    };
    userFixture.loginAs(UserFixture.pekkaProjari);
    await expect(validateTallennaProjekti(projekti, projektiInput)).to.eventually.equal(undefined);
  });

  it("antaa luoda uuden vuorovaikutuskierroksen niin, että se on samana päivänä kuin edellinen", async () => {
    const projekti = fixture.dbProjektiLackingNahtavillaoloVaihe();
    const aiempiJulkaisuPaiva = projekti.vuorovaikutusKierrosJulkaisut?.[0]?.vuorovaikutusJulkaisuPaiva;
    projekti.vuorovaikutusKierros = {
      vuorovaikutusNumero: 2,
      tila: VuorovaikutusKierrosTila.MUOKATTAVISSA,
    };
    const projektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 2,
        vuorovaikutusJulkaisuPaiva: aiempiJulkaisuPaiva,
      },
    };
    userFixture.loginAs(UserFixture.pekkaProjari);
    await expect(validateTallennaProjekti(projekti, projektiInput)).to.eventually.equal(undefined);
  });

  it("antaa luoda uuden vuorovaikutuskierroksen", async () => {
    const projekti = fixture.dbProjekti1();
    const projektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 1,
        vuorovaikutusJulkaisuPaiva: "2099-01-01",
      },
    };
    userFixture.loginAs(UserFixture.pekkaProjari);
    await expect(validateTallennaProjekti(projekti, projektiInput)).to.eventually.equal(undefined);
  });
});
