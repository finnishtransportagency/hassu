/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { FixtureName, useProjektiTestFixture } from "./testFixtureRecorder";
import { deleteProjekti, tallennaLogo } from "./testUtil/tests";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { api } from "./apiClient";
import { defaultMocks, expectToMatchSnapshot, takeYllapitoS3Snapshot } from "./testUtil/util";
import { cleanupGeneratedIdAndTimestampFromFeedbacks } from "./testUtil/cleanUpFunctions";
import * as sinon from "sinon";

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Palaute", () => {
  const userFixture = new UserFixture(userService);
  const { awsCloudfrontInvalidationStub, emailClientStub } = defaultMocks();
  before(async () => {
    try {
      await deleteProjekti(oid);
      awsCloudfrontInvalidationStub.reset();
    } catch (_ignore) {
      // ignore
    }
    await useProjektiTestFixture(FixtureName.NAHTAVILLAOLO);
  });

  after(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("should insert and manage feedback", async () => {
    userFixture.logout();
    const palauteId = await api.lisaaPalaute(oid, {
      etunimi: "Matti",
      sukunimi: "Meikalainen",
      puhelinnumero: "123456",
      sahkoposti: "test@vayla.fi",
      yhteydenottotapaPuhelin: true,
      yhteydenottotapaEmail: false,
      kysymysTaiPalaute: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      liite: await tallennaLogo(),
    });

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const palautteet = await api.listaaPalautteet(oid);

    expectToMatchSnapshot("projekti palaute lisätty", cleanupGeneratedIdAndTimestampFromFeedbacks(palautteet));

    await api.otaPalauteKasittelyyn(oid, palauteId);

    const palautteetAfterFeedbackBeingHandled = await api.listaaPalautteet(oid);
    await expectToMatchSnapshot(
      "projekti palaute otettu käsittelyyn",
      cleanupGeneratedIdAndTimestampFromFeedbacks(palautteetAfterFeedbackBeingHandled)
    );
    emailClientStub.verifyEmailsSent();
    await takeYllapitoS3Snapshot(oid, "should insert and manage feedback", "palautteet");
  });
});
