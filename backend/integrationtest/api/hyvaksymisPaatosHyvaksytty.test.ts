/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { FixtureName, recordProjektiTestFixture, useProjektiTestFixture } from "./testFixtureRecorder";
import { asetaAika, deleteProjekti, loadProjektiFromDatabase, loadProjektiJulkinenFromDatabase } from "./testUtil/tests";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { Status } from "hassu-common/graphql/apiModel";
import { api } from "./apiClient";
import { IllegalAccessError } from "hassu-common/error";
import {
  defaultMocks,
  expectJulkinenNotFound,
  expectToMatchSnapshot,
  mockSaveProjektiToVelho,
  verifyProjektiSchedule,
} from "./testUtil/util";
import { assertIsDefined } from "../../src/util/assertions";
import assert from "assert";

import chai from "chai";
import { eventSqsClient } from "../../src/sqsEvents/eventSqsClient";
import { log } from "../../src/logger";

const { expect } = chai;

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Hyväksytyn hyväksymispäätöskuulutuksen jälkeen", () => {
  const userFixture = new UserFixture(userService);
  const { awsCloudfrontInvalidationStub, eventSqsClientMock } = defaultMocks();

  before(async () => {
    mockSaveProjektiToVelho();
    await deleteProjekti(oid);
    awsCloudfrontInvalidationStub.reset();
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
    // Käyttäjältä puuttuu oikeudet
    await expect(api.tallennaProjekti(projektiWithJatkopaatos1)).to.eventually.be.rejectedWith(IllegalAccessError);

    // Tallenna jatkopäätös admin-käyttäjänä
    userFixture.loginAs(UserFixture.hassuAdmin);
    await api.tallennaProjekti(projektiWithJatkopaatos1);

    // Tallennuksen tulos:
    // * jatkopäätöksen tallennus resetoi projektin henkilöt
    // TODO: suunnittelusopimuksen henkilöviittaus pitäisi toteuttaa pois, jotta ko. henkilön voi poistaa -> 20.3.2023 nyt kunnan edustaja lisataan aina takaisin kaytto-oikeuksiin, tarvittaessa muokattavana ns. hassu-henkilona
    // * Projekti on jatkopäätösvaiheessa
    const jatkopaatosProjekti = await expectYllapitoProjektiStatus(Status.JATKOPAATOS_1_AINEISTOT);
    jatkopaatosProjekti.paivitetty = "***unit test***";
    log.error("Jatkopäätöksen käyttöoikeudet", { kayttoOikeudet: jatkopaatosProjekti.kayttoOikeudet });
    expectToMatchSnapshot("jatkopaatosProjekti käyttöoikeudet resetoinnin jälkeen", jatkopaatosProjekti.kayttoOikeudet);
    await expectJulkinenNotFound(oid, userFixture);

    await recordProjektiTestFixture(FixtureName.JATKOPAATOS_1_ALKU, oid);
  }

  it("should get epäaktiivinen and jatkopäätös1 statuses successfully", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    asetaAika("2025-01-02");
    await expectJulkinenProjektiStatus(Status.HYVAKSYTTY);
    await verifyProjektiSchedule(oid, "Ajastukset kun projekti on hyväksytty. Pitäisi olla ajastus epäaktiiviseksi menemiselle.");

    // Kuulutusvaihepäättyypäivä yli vuosi menneisyyteen
    asetaAika("2027-02-02");
    await expectYllapitoProjektiStatus(Status.EPAAKTIIVINEN_1);
    await expectJulkinenNotFound(oid, userFixture);

    const epaAktiivinenProjekti1 = await projektiDatabase.loadProjektiByOid(oid);
    assertIsDefined(epaAktiivinenProjekti1);
    // Käynnistä ajastettu aineistojen poisto, koska projekti on mennyt epäaktiiviseksi. Tässä testissä toiminnallisuus ei ole ajastuksia luonut, joten ajetaan synkronointi manuaalisesti tässä:
    await eventSqsClient.handleChangedAineisto(oid);
    await eventSqsClientMock.processQueue();
    await recordProjektiTestFixture(FixtureName.EPAAKTIIVINEN_1, oid);
    log.error("Jatkopäätöksen käyttöoikeudet ennen käsittelyn tilan lisäämistä", { kayttoOikeudet: epaAktiivinenProjekti1.kayttoOikeudet });
    await lisaaKasittelynTilaJatkopaatos1({
      oid,
      versio: epaAktiivinenProjekti1.versio,
      kasittelynTila: {
        ensimmainenJatkopaatos: { paatoksenPvm: "2027-02-02", asianumero: "jatkopaatos1_asianumero", aktiivinen: true },
      },
    });

    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();
  });
});
