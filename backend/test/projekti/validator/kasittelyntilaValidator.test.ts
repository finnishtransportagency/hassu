import { describe, it } from "mocha";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import * as sinon from "sinon";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { personSearch } from "../../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../../src/personSearch/kayttajas";
import { validateTallennaProjekti } from "../../../src/projekti/validator/projektiValidator";
import { projektiAdapter } from "../../../src/projekti/adapter/projektiAdapter";
import { Status, TallennaProjektiInput } from "hassu-common/graphql/apiModel";

import { expect } from "chai";
import { parameters } from "../../../src/aws/parameters";
import { fileService } from "../../../src/files/fileService";

const ELY_UID = "A1";
const VAYLA_UID = "A2";

describe("kasittelyntilaValidator", () => {
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
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(fileService, "getFileContentLength").returns(Promise.resolve(400));

    fixture = new ProjektiFixture();
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("Admin ei voi muokata hyvaksymispaatos kenttää kun projekti on SUUNNITTELU vaiheessa", async () => {
    const projekti = fixture.dbProjekti2();
    userFixture.loginAs(UserFixture.hassuAdmin);
    const apiProjekti = await projektiAdapter.adaptProjekti(projekti);
    expect(apiProjekti.status).to.be.equal(Status.SUUNNITTELU);
    // Projektin status on SUUNNITTELU, joten hyväksymispäätöksiä ei voi tallentaa vielä
    await expect(
      validateTallennaProjekti(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        kasittelynTila: { hyvaksymispaatos: { aktiivinen: true, asianumero: "asianumero-123", paatoksenPvm: "2022-04-04" } },
      })
    ).to.eventually.rejectedWith("Hyväksymispäätöstä voidaan muokata vasta nähtävilläolovaiheessa tai sitä myöhemmin");
  });

  it("Admin ei voi muokata ensimmainenJatkopaatos kenttää kun projekti on SUUNNITTELU vaiheessa", async () => {
    const projekti = fixture.dbProjekti2();
    userFixture.loginAs(UserFixture.hassuAdmin);
    const apiProjekti = await projektiAdapter.adaptProjekti(projekti);
    expect(apiProjekti.status).to.be.equal(Status.SUUNNITTELU);
    // Projektin status on SUUNNITTELU, joten hyväksymispäätöksiä ei voi tallentaa vielä
    await expect(
      validateTallennaProjekti(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        kasittelynTila: { ensimmainenJatkopaatos: { aktiivinen: true, asianumero: "asianumero-123", paatoksenPvm: "2022-04-04" } },
      })
    ).to.eventually.rejectedWith("Ensimmäistä jatkopäätöstä voi muokata vain hyväksymispäätöksen jälkeisen epäaktiivisuuden jälkeen");
  });

  it("Admin ei voi muokata toinenJatkopaatos kenttää kun projekti on SUUNNITTELU vaiheessa", async () => {
    const projekti = fixture.dbProjekti2();
    userFixture.loginAs(UserFixture.hassuAdmin);
    const apiProjekti = await projektiAdapter.adaptProjekti(projekti);
    expect(apiProjekti.status).to.be.equal(Status.SUUNNITTELU);
    // Projektin status on SUUNNITTELU, joten hyväksymispäätöksiä ei voi tallentaa vielä
    await expect(
      validateTallennaProjekti(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        kasittelynTila: { toinenJatkopaatos: { aktiivinen: true, asianumero: "asianumero-123", paatoksenPvm: "2022-04-04" } },
      })
    ).to.eventually.rejected;
  });

  it("Admin ei voi muokata ensimmainenJatkopaatos kenttää kun projekti on NAHTAVILLAOLO vaiheessa", async () => {
    const projekti = fixture.dbProjekti4();
    const apiProjekti = await projektiAdapter.adaptProjekti(projekti);
    expect(apiProjekti.status).to.be.equal(Status.NAHTAVILLAOLO);
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kasittelynTila: { ensimmainenJatkopaatos: { aktiivinen: true, asianumero: "asianumero-123", paatoksenPvm: "2022-04-04" } },
    };
    userFixture.loginAs(UserFixture.hassuAdmin);
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.rejectedWith(
      "Ensimmäistä jatkopäätöstä voi muokata vain hyväksymispäätöksen jälkeisen epäaktiivisuuden jälkeen. Projektin status nyt:NAHTAVILLAOLO"
    );
  });

  it("Admin ei voi muokata ensimmainenJatkopaatos kenttää kun hyvaksymispaatos puuttuu", async () => {
    const projekti = fixture.dbProjektiKaikkiVaiheetSaame();
    if (projekti.kasittelynTila?.hyvaksymispaatos) {
      delete projekti.kasittelynTila.hyvaksymispaatos;
    }
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kasittelynTila: { ensimmainenJatkopaatos: { aktiivinen: true, asianumero: "asianumero-123", paatoksenPvm: "2022-04-04" } },
    };
    userFixture.loginAs(UserFixture.hassuAdmin);
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejected;
  });

  it("Admin ei voi muokata toinenJatkopaatos kenttää kun hyvaksymispaatos puuttuu", async () => {
    const projekti = fixture.dbProjektiKaikkiVaiheetSaame();
    if (projekti.kasittelynTila?.hyvaksymispaatos) {
      delete projekti.kasittelynTila.hyvaksymispaatos;
    }
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kasittelynTila: { toinenJatkopaatos: { aktiivinen: true, asianumero: "asianumero-123", paatoksenPvm: "2022-04-04" } },
    };
    userFixture.loginAs(UserFixture.hassuAdmin);
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejected;
  });

  it("Admin ei voi muokata toinenJatkopaatos kenttää kun ensimmainenJatkopaatos puuttuu", async () => {
    const projekti = fixture.dbProjektiKaikkiVaiheetSaame();
    if (projekti.kasittelynTila?.ensimmainenJatkopaatos) {
      delete projekti.kasittelynTila.ensimmainenJatkopaatos;
    }
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kasittelynTila: { toinenJatkopaatos: { aktiivinen: true, asianumero: "asianumero-123", paatoksenPvm: "2022-04-04" } },
    };
    userFixture.loginAs(UserFixture.hassuAdmin);
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejected;
  });

  it("Admin voi muokata hyvaksymispaatos kenttää kun projekti on NAHTAVILLAOLO vaiheessa", async () => {
    const projekti = fixture.dbProjekti4();
    const apiProjekti = await projektiAdapter.adaptProjekti(projekti);
    expect(apiProjekti.status).to.be.equal(Status.NAHTAVILLAOLO);
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kasittelynTila: { hyvaksymispaatos: { aktiivinen: true, asianumero: "asianumero-123", paatoksenPvm: "2022-04-04" } },
    };
    userFixture.loginAs(UserFixture.hassuAdmin);
    await validateTallennaProjekti(projekti, input);
  });

  it("Projektipäällikkö voi muokata hyvaksymispaatos kenttää kun projekti on NAHTAVILLAOLO vaiheessa", async () => {
    const projekti = fixture.dbProjekti4();
    const apiProjekti = await projektiAdapter.adaptProjekti(projekti);
    expect(apiProjekti.status).to.be.equal(Status.NAHTAVILLAOLO);
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kasittelynTila: { hyvaksymispaatos: { aktiivinen: true, asianumero: "asianumero-123", paatoksenPvm: "2022-04-04" } },
    };
    userFixture.loginAs(UserFixture.pekkaProjari);
    await validateTallennaProjekti(projekti, input);
  });

  it("Projektipäällikkö ei voi muokata muita kuin hyvaksymispaatos kenttää kun kasittelynTilasta", async () => {
    const projekti = fixture.dbProjekti4();
    const apiProjekti = await projektiAdapter.adaptProjekti(projekti);
    expect(apiProjekti.status).to.be.equal(Status.NAHTAVILLAOLO);
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kasittelynTila: { lisatieto: "Päällikön lisäämä lisätieto" },
    };
    userFixture.loginAs(UserFixture.pekkaProjari);
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.rejectedWith(
      "Sinulla ei ole admin-oikeuksia (Muita Käsittelyn tila -tietoja kuin hyväksymispäätöstietoja voi tallentaa vain Hassun yllapitaja)"
    );
    input.kasittelynTila = { lainvoimaAlkaen: "2022-01-01" };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.rejectedWith(
      "Sinulla ei ole admin-oikeuksia (Muita Käsittelyn tila -tietoja kuin hyväksymispäätöstietoja voi tallentaa vain Hassun yllapitaja)"
    );
  });

  it("Projektipäällikkö ei voi muokata jatkopäätoskenttiä kasittelynTilasta", async () => {
    const projekti = fixture.dbProjektiKaikkiVaiheetSaame();
    const apiProjekti = await projektiAdapter.adaptProjekti(projekti);
    expect(apiProjekti.status).to.be.equal(Status.EPAAKTIIVINEN_3);
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kasittelynTila: { ensimmainenJatkopaatos: { paatoksenPvm: "2022-03-03", aktiivinen: true, asianumero: "asianumero-123" } },
    };
    userFixture.loginAs(UserFixture.hassuATunnus1);
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.rejectedWith(
      "Sinulla ei ole admin-oikeuksia (Muita Käsittelyn tila -tietoja kuin hyväksymispäätöstietoja voi tallentaa vain Hassun yllapitaja)"
    );
    input.kasittelynTila = { toinenJatkopaatos: { paatoksenPvm: "2022-03-03", aktiivinen: true, asianumero: "asianumero-123" } };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.rejectedWith(
      "Sinulla ei ole admin-oikeuksia (Muita Käsittelyn tila -tietoja kuin hyväksymispäätöstietoja voi tallentaa vain Hassun yllapitaja)"
    );
  });

  it("Admin voi muokata hyvaksymispaatos, ensimmainenJatkopaatos ja toinenJatkopaatos-kenttiä kun projekti on EPAAKTIIVINEN_3 vaiheessa", async () => {
    const projekti = fixture.dbProjektiKaikkiVaiheetSaame();
    const apiProjekti = await projektiAdapter.adaptProjekti(projekti);
    expect(apiProjekti.status).to.be.equal(Status.EPAAKTIIVINEN_3);
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kasittelynTila: {
        hyvaksymispaatos: { aktiivinen: true, asianumero: "asianumero-123", paatoksenPvm: "2022-04-04" },
        ensimmainenJatkopaatos: { aktiivinen: true, asianumero: "asianumero-123", paatoksenPvm: "2022-04-04" },
        toinenJatkopaatos: { aktiivinen: true, asianumero: "asianumero-123", paatoksenPvm: "2022-04-04" },
      },
    };
    userFixture.loginAs(UserFixture.hassuAdmin);
    await validateTallennaProjekti(projekti, input);
  });

  it("Projektin henkilö (ei projektipäällikkö) ei voi tallentaa kasittelynTilaa", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const projekti = fixture.dbProjekti2();
    const input: TallennaProjektiInput = { oid: projekti.oid, versio: projekti.versio, kasittelynTila: {} };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(
      "Et ole projektin omistaja (Käsittelyn tilaa voi muokata vain projektipäällikkö)"
    );
  });
});
