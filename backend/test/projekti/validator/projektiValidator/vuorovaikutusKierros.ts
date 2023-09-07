import { describe, it } from "mocha";
import { ProjektiFixture } from "../../../fixture/projektiFixture";
import * as sinon from "sinon";
import { UserFixture } from "../../../fixture/userFixture";
import { userService } from "../../../../src/user";
import { personSearch } from "../../../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../../../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../../../src/personSearch/kayttajas";
import { validateTallennaProjekti } from "../../../../src/projekti/validator/projektiValidator";
import { VuorovaikutusKierrosTila } from "../../../../../common/graphql/apiModel";
import { IllegalArgumentError } from "../../../../src/error/IllegalArgumentError";
import dayjs from "dayjs";

const { expect } = require("chai");

const ELY_UID = "A1";
const VAYLA_UID = "A2";

describe("projektiValidator (vuorovaikutusKierrosValidator)", () => {
  let fixture: ProjektiFixture;
  const userFixture = new UserFixture(userService);

  beforeEach(() => {
    const personSearchFixture = new PersonSearchFixture();
    const elyUser = personSearchFixture.createKayttaja(ELY_UID, "ELY");
    const vaylaUser = personSearchFixture.createKayttaja(VAYLA_UID);
    const kayttaja1 = personSearchFixture.createKayttaja("A123");
    const kayttaja2 = personSearchFixture.createKayttaja("A000111");
    const kayttaja3 = personSearchFixture.createKayttaja("A000123");
    sinon.stub(personSearch, "getKayttajas").resolves(Kayttajas.fromKayttajaList([elyUser, vaylaUser, kayttaja1, kayttaja2, kayttaja3]));

    fixture = new ProjektiFixture();
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("ei anna luoda uutta vuorovaikutuskierrosta niin, että se on edellistä aiemmin", async () => {
    const projekti = fixture.dbProjektiLackingNahtavillaoloVaihe();
    const aiempiJulkaisuPaiva = projekti.vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva;
    projekti.vuorovaikutusKierros = {
      vuorovaikutusNumero: 2,
      tila: VuorovaikutusKierrosTila.MUOKATTAVISSA,
    };
    const projektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 2,
        vuorovaikutusJulkaisuPaiva: dayjs(aiempiJulkaisuPaiva).subtract(1, "day").format("DD-MM-YYYY"),
      },
    };
    userFixture.loginAs(UserFixture.pekkaProjari);
    expect(validateTallennaProjekti(projekti, projektiInput)).eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("antaa luoda uuden vuorovaikutuskierroksen niin, että se on edellistä myöhemmin", async () => {
    const projekti = fixture.dbProjektiLackingNahtavillaoloVaihe();
    const aiempiJulkaisuPaiva = projekti.vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva;
    projekti.vuorovaikutusKierros = {
      vuorovaikutusNumero: 2,
      tila: VuorovaikutusKierrosTila.MUOKATTAVISSA,
    };
    const projektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 2,
        vuorovaikutusJulkaisuPaiva: dayjs(aiempiJulkaisuPaiva).add(1, "day").format("DD-MM-YYYY"),
      },
    };
    userFixture.loginAs(UserFixture.pekkaProjari);
    return expect(validateTallennaProjekti(projekti, projektiInput)).to.eventually.equal(undefined);
  });

  it("antaa luoda uuden vuorovaikutuskierroksen niin, että se on samana päivänä kuin edellinen", async () => {
    const projekti = fixture.dbProjektiLackingNahtavillaoloVaihe();
    const aiempiJulkaisuPaiva = projekti.vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva;
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
    return expect(validateTallennaProjekti(projekti, projektiInput)).to.eventually.equal(undefined);
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
    return expect(validateTallennaProjekti(projekti, projektiInput)).to.eventually.equal(undefined);
  });
});
