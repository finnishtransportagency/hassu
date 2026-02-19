/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { FixtureName, useProjektiTestFixture } from "./testFixtureRecorder";
import { asetaAika, deleteProjekti, tallennaLogo } from "./testUtil/tests";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { api } from "./apiClient";
import { defaultMocks, expectToMatchSnapshot, takeYllapitoS3Snapshot } from "./testUtil/util";
import { cleanupGeneratedIdAndTimestampFromFeedbacks } from "../../commonTestUtil/cleanUpFunctions";
import * as sinon from "sinon";
import fs from "fs";
import { virusScanService } from "../../src/files/virusScanService";

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Palaute", () => {
  const userFixture = new UserFixture(userService);
  const { awsCloudfrontInvalidationStub, emailClientStub } = defaultMocks();
  before(async () => {
    await deleteProjekti(oid);
    awsCloudfrontInvalidationStub.reset();
    await useProjektiTestFixture(FixtureName.NAHTAVILLAOLO);
    sinon.stub(virusScanService, "runScanOnFile");
  });

  after(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("should insert and manage feedback", async () => {
    userFixture.logout();
    asetaAika("2023-01-01");
    const palauteId = await api.lisaaPalaute(oid, {
      etunimi: "Matti",
      sukunimi: "Meikalainen",
      puhelinnumero: "123456",
      sahkoposti: "test@vayla.fi",
      yhteydenottotapaPuhelin: true,
      yhteydenottotapaEmail: false,
      kysymysTaiPalaute: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      liitteet: [await tallennaLogo()],
    });
    await api.lisaaPalaute(oid, {
      etunimi: "Joku",
      sukunimi: "Toinen",
      puhelinnumero: "123456",
      sahkoposti: "test@vayla.fi",
      yhteydenottotapaPuhelin: true,
      yhteydenottotapaEmail: true,
      kysymysTaiPalaute:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    });
    await api.lisaaPalaute(oid, {
      etunimi: "",
      sukunimi: "",
      puhelinnumero: "",
      sahkoposti: "",
      yhteydenottotapaPuhelin: true,
      yhteydenottotapaEmail: true,
      kysymysTaiPalaute: "Nimetön palaute.",
    });

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const palautteet = await api.listaaPalautteet(oid);

    expectToMatchSnapshot("projekti palaute lisätty", cleanupGeneratedIdAndTimestampFromFeedbacks(palautteet));

    await api.asetaPalauteVastattu(oid, palauteId, true);

    const palautteetAfterFeedbackAnswered = await api.listaaPalautteet(oid);
    await expectToMatchSnapshot(
      "projekti palaute otettu käsittelyyn",
      cleanupGeneratedIdAndTimestampFromFeedbacks(palautteetAfterFeedbackAnswered)
    );
    emailClientStub.verifyEmailsSent();
    await takeYllapitoS3Snapshot(oid, "should insert and manage feedback", "palautteet");

    const pdf = await api.lataaPalautteetPDF(oid);
    fs.mkdirSync(".report", { recursive: true });
    fs.writeFileSync(".report/" + pdf.nimi, new Uint8Array(Buffer.from(pdf.sisalto, "base64")));
  });
});
