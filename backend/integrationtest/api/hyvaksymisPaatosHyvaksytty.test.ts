// @ts-nocheck

/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { FixtureName, MOCKED_TIMESTAMP, useProjektiTestFixture } from "./testFixtureRecorder";
import { setupLocalDatabase } from "../util/databaseUtil";
import { deleteProjekti, loadProjektiFromDatabase, loadProjektiJulkinenFromDatabase } from "./testUtil/tests";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import dayjs from "dayjs";
import { Status } from "../../../common/graphql/apiModel";
import { assert, expect } from "chai";
import { ISO_DATE_FORMAT } from "../../src/util/dateUtil";

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Hyväksytyn hyväksymispäätöskuulutuksen jälkeen", () => {
  let userFixture: UserFixture;

  before(async () => {
    userFixture = new UserFixture(userService);

    await setupLocalDatabase();
    try {
      await deleteProjekti(oid);
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
    const julkaisu = dbProjekti.hyvaksymisPaatosVaiheJulkaisut[0];
    // Päättymispäivä yli vuosi menneisyyteen, jotta projekti menee epäaktiiviseksi
    julkaisu.kuulutusVaihePaattyyPaiva = dayjs().add(-1, "day").format(ISO_DATE_FORMAT);
    await projektiDatabase.updateHyvaksymisPaatosVaiheJulkaisu(dbProjekti, julkaisu);
  }

  async function setKuulutusVaihePaattyyPaivaToOverOneYearAgo() {
    const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
    const julkaisu = dbProjekti.hyvaksymisPaatosVaiheJulkaisut[0];
    // Päättymispäivä yli vuosi menneisyyteen, jotta projekti menee epäaktiiviseksi
    julkaisu.kuulutusVaihePaattyyPaiva = dayjs().add(-1, "year").add(-1, "day").format(ISO_DATE_FORMAT);
    await projektiDatabase.updateHyvaksymisPaatosVaiheJulkaisu(dbProjekti, julkaisu);
  }

  async function expectYllapitoProjektiStatus(expectedStatus: Status) {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await loadProjektiFromDatabase(oid, expectedStatus); // Verify status in yllapito
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

  async function expectJulkinenNotFound() {
    userFixture.logout();
    try {
      await loadProjektiJulkinenFromDatabase(oid);
      assert.fail("Projektilla on julkista sisältöä vaikka ei pitäisi");
    } catch (e) {
      // expected
    }
    userFixture.loginAs(UserFixture.mattiMeikalainen);
  }

  it("should get epäaktiivinen and jatkopäätös1 statuses successfully", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await setKuulutusVaihePaattyyPaivaToYesterday();
    await expectJulkinenProjektiStatus(Status.HYVAKSYTTY);
    await setKuulutusVaihePaattyyPaivaToOverOneYearAgo();
    await expectYllapitoProjektiStatus(Status.EPAAKTIIVINEN);
    await expectJulkinenNotFound();

    const epaAktiivinenProjekti1 = await projektiDatabase.loadProjektiByOid(oid);
    expect(epaAktiivinenProjekti1.ajastettuTarkistus).to.eql("2101-01-01T23:59:00+02:00"); // MOCKED_TIMESTAMP + 1 year
    // TODO aineistojen ajastettu poisto tässä kohtaa

    await projektiDatabase.saveProjekti({
      oid,
      kasittelynTila: {
        ...epaAktiivinenProjekti1.kasittelynTila,
        ensimmainenJatkopaatos: { paatoksenPvm: MOCKED_TIMESTAMP, asianumero: "jatkopaatos1_asianumero" },
      },
    });

    await expectYllapitoProjektiStatus(Status.JATKOPAATOS_1);
    await expectJulkinenNotFound();

    // TODO hyväksytty jatkopäätös1
    // TODO hyväksytty epäaktiivinen2
    // TODO hyväksytty jatkopäätös2
    // TODO hyväksytty epäaktiivinen2
  });
});
