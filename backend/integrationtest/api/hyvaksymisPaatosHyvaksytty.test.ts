/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { FixtureName, MOCKED_TIMESTAMP, recordProjektiTestFixture, useProjektiTestFixture } from "./testFixtureRecorder";
import { asetaAika, deleteProjekti, loadProjektiFromDatabase, loadProjektiJulkinenFromDatabase } from "./testUtil/tests";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { Status } from "../../../common/graphql/apiModel";
import { api } from "./apiClient";
import { IllegalAccessError } from "../../src/error/IllegalAccessError";
import { defaultMocks, expectJulkinenNotFound, expectToMatchSnapshot, mockSaveProjektiToVelho } from "./testUtil/util";
import { assertIsDefined } from "../../src/util/assertions";
import assert from "assert";

const chai = require("chai");
const { expect } = chai;

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Hyväksytyn hyväksymispäätöskuulutuksen jälkeen", () => {
  const userFixture = new UserFixture(userService);
  const { awsCloudfrontInvalidationStub } = defaultMocks();

  before(async () => {
    mockSaveProjektiToVelho();
    try {
      await deleteProjekti(oid);
      awsCloudfrontInvalidationStub.reset();
    } catch (_ignore) {
      // ignore
    }
    await useProjektiTestFixture(FixtureName.HYVAKSYMISPAATOS_APPROVED);
  });

  after(() => {
    userFixture.logout();
    sinon.restore();
  });

  async function expectYllapitoProjektiStatus(expectedStatus: Status) {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    return await loadProjektiFromDatabase(oid, expectedStatus); // Verify status in yllapito
  }

  async function expectJulkinenProjektiStatus(expectedStatus: Status) {
    userFixture.logout();
    try {
      await loadProjektiJulkinenFromDatabase(oid, expectedStatus);
    } catch (e) {
      console.log(e);
      assert.fail("Could not load julkinen projekti from API");
    }
    userFixture.loginAs(UserFixture.mattiMeikalainen);
  }

  async function lisaaKasittelynTilaJatkopaatos1(projektiWithJatkopaatos1: {
    kasittelynTila: { ensimmainenJatkopaatos: { asianumero: string; paatoksenPvm: string; aktiivinen: boolean } };
    oid: string;
    versio: number;
  }) {
    await expect(api.tallennaProjekti(projektiWithJatkopaatos1)).to.eventually.be.rejectedWith(
      IllegalAccessError,
      "Sinulla ei ole admin-oikeuksia (Hyvaksymispaatoksia voi tallentaa vain Hassun yllapitaja)"
    );

    // Tallenna jatkopäätös admin-käyttäjänä
    userFixture.loginAs(UserFixture.hassuAdmin);
    await api.tallennaProjekti(projektiWithJatkopaatos1);

    // Tallennuksen tulos:
    // * jatkopäätöksen tallennus resetoi projektin henkilöt
    // TODO: suunnittelusopimuksen henkilöviittaus pitäisi toteuttaa pois, jotta ko. henkilön voi poistaa -> 20.3.2023 nyt kunnan edustaja lisataan aina takaisin kaytto-oikeuksiin, tarvittaessa muokattavana ns. hassu-henkilona
    // * Projekti on jatkopäätösvaiheessa
    const jatkopaatosProjekti = await expectYllapitoProjektiStatus(Status.JATKOPAATOS_1_AINEISTOT);
    jatkopaatosProjekti.paivitetty = "***unit test***";
    expectToMatchSnapshot("jatkopaatosProjekti käyttöoikeudet resetoinnin jälkeen", jatkopaatosProjekti.kayttoOikeudet);
    await expectJulkinenNotFound(oid, userFixture);

    await recordProjektiTestFixture(FixtureName.JATKOPAATOS_1_ALKU, oid);
  }

  it("should get epäaktiivinen and jatkopäätös1 statuses successfully", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    asetaAika("2025-01-01");
    await expectJulkinenProjektiStatus(Status.HYVAKSYTTY);
    // Kuulutusvaihepäättyypäivä yli vuosi menneisyyteen
    asetaAika("2027-02-01");
    await expectYllapitoProjektiStatus(Status.EPAAKTIIVINEN_1);
    await expectJulkinenNotFound(oid, userFixture);

    const epaAktiivinenProjekti1 = await projektiDatabase.loadProjektiByOid(oid);
    assertIsDefined(epaAktiivinenProjekti1);
    // TODO Aineistot poistetaan vuosi epäaktiivisen olon jälkeen

    await lisaaKasittelynTilaJatkopaatos1({
      oid,
      versio: epaAktiivinenProjekti1.versio,
      kasittelynTila: {
        ensimmainenJatkopaatos: { paatoksenPvm: MOCKED_TIMESTAMP, asianumero: "jatkopaatos1_asianumero", aktiivinen: true },
      },
    });

    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();
  });
});
