/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { FixtureName, MOCKED_TIMESTAMP, recordProjektiTestFixture, useProjektiTestFixture } from "./testFixtureRecorder";
import { deleteProjekti, loadProjektiFromDatabase, loadProjektiJulkinenFromDatabase } from "./testUtil/tests";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import dayjs from "dayjs";
import { Status } from "../../../common/graphql/apiModel";
import { ISO_DATE_FORMAT } from "../../src/util/dateUtil";
import { api } from "./apiClient";
import { IllegalAccessError } from "../../src/error/IllegalAccessError";
import { defaultMocks, expectJulkinenNotFound, expectToMatchSnapshot, mockSaveProjektiToVelho } from "./testUtil/util";
import { assertIsDefined } from "../../src/util/assertions";
import assert from "assert";

const chai = require("chai");
const { expect } = chai;

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Hyväksytyn hyväksymispäätöskuulutuksen jälkeen", () => {
  let userFixture: UserFixture;
  const { awsCloudfrontInvalidationStub } = defaultMocks();

  before(async () => {
    userFixture = new UserFixture(userService);

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

  async function setKuulutusVaihePaattyyPaivaToYesterday() {
    const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
    assertIsDefined(dbProjekti?.hyvaksymisPaatosVaiheJulkaisut);
    const julkaisu = dbProjekti.hyvaksymisPaatosVaiheJulkaisut[0];
    // Päättymispäivä yli vuosi menneisyyteen, jotta projekti menee epäaktiiviseksi
    julkaisu.kuulutusVaihePaattyyPaiva = dayjs().add(-1, "day").format(ISO_DATE_FORMAT);
    await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.update(dbProjekti, julkaisu);
  }

  async function setKuulutusVaihePaattyyPaivaToOverOneYearAgo() {
    const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
    assertIsDefined(dbProjekti?.hyvaksymisPaatosVaiheJulkaisut);
    const julkaisu = dbProjekti.hyvaksymisPaatosVaiheJulkaisut[0];
    // Päättymispäivä yli vuosi menneisyyteen, jotta projekti menee epäaktiiviseksi
    julkaisu.kuulutusVaihePaattyyPaiva = dayjs().add(-1, "year").add(-1, "day").format(ISO_DATE_FORMAT);
    await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.update(dbProjekti, julkaisu);
  }

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
    // * jatkopäätöksen tallennus resetoi projektin henkilöt TODO: suunnittelusopimuksen henkilöviittaus pitäisi toteuttaa pois, jotta ko. henkilön voi poistaa
    // * Projekti on jatkopäätösvaiheessa
    let jatkopaatosProjekti = await expectYllapitoProjektiStatus(Status.JATKOPAATOS_1_AINEISTOT);
    jatkopaatosProjekti.paivitetty = "***unit test***";
    expectToMatchSnapshot("jatkopaatosProjekti käyttöoikeudet resetoinnin jälkeen", jatkopaatosProjekti.kayttoOikeudet);
    await expectJulkinenNotFound(oid, userFixture);

    await recordProjektiTestFixture(FixtureName.JATKOPAATOS_1_ALKU, oid);
  }

  it("should get epäaktiivinen and jatkopäätös1 statuses successfully", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    await setKuulutusVaihePaattyyPaivaToYesterday();
    await expectJulkinenProjektiStatus(Status.HYVAKSYTTY);
    await setKuulutusVaihePaattyyPaivaToOverOneYearAgo();
    await expectYllapitoProjektiStatus(Status.EPAAKTIIVINEN_1);
    await expectJulkinenNotFound(oid, userFixture);

    const epaAktiivinenProjekti1 = await projektiDatabase.loadProjektiByOid(oid);
    assertIsDefined(epaAktiivinenProjekti1);
    expect(epaAktiivinenProjekti1!.ajastettuTarkistus).to.eql("2101-01-01T23:59:59+02:00"); // MOCKED_TIMESTAMP + 1 year
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
