/* eslint-disable */
// dotenv initialization must be in the beginning to load the ENV variables properly
const dotenv = require("dotenv");
dotenv.config({ path: ".env.test" });
dotenv.config({ path: ".env.local" });
/* eslint-enable */

import { recordProjektiTestFixture } from "../backend/integrationtest/api/testFixtureRecorder";
import { importProjektis } from "./migration-cli";
import * as sinon from "sinon";

describe("Migraatio", () => {
  beforeEach(async () => sinon.restore());

  it("ajetaan migraatio ensimmaisen valilehden testiprojekteille", async () => {
    const importedProjektis = await importProjektis(__dirname + "/migraatiotesti.xlsx", 1, true);
    for (const oid in importedProjektis) {
      const targetStatus = importedProjektis[oid];
      await recordProjektiTestFixture("migraatio_" + targetStatus, oid);
    }
  });

  it("ajetaan migraatio toisen valilehden testiprojekteille", async () => {
    const importedProjektis = await importProjektis(__dirname + "/migraatiotesti.xlsx", 2, true);
    for (const oid in importedProjektis) {
      const targetStatus = importedProjektis[oid];
      await recordProjektiTestFixture("migraatio_" + targetStatus, oid);
    }
  });

  // it("ajetaan migraatio valilehdelle, jota ei ole olemassa", async () => {
  //   const processStub = sinon.stub(process, "exit");
  //   await importProjektis(__dirname + "/migraatiotesti.xlsx", 10, true);
  //   assert(processStub.calledWith(1));
  // });

  it("ajetaan migraatio olemassa oleville projekteille paallekirjoituksen ollessa estetty", async () => {
    await importProjektis(__dirname + "/migraatiotesti.xlsx", 1, false);
  });
});
