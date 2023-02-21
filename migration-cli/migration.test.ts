/* eslint-disable */
// dotenv initialization must be in the beginning to load the ENV variables properly
const dotenv = require("dotenv");
dotenv.config({ path: ".env.test" });
dotenv.config({ path: ".env.local" });
/* eslint-enable */

import { recordProjektiTestFixture } from "../backend/integrationtest/api/testFixtureRecorder";
import { importProjektis } from "./migration-cli";

describe("Migraatio", () => {
  it("ajetaan migraatio testiprojekteille", async () => {
    const importedProjektis = await importProjektis(__dirname + "/migraatiotesti.xlsx", argv.sheetNum, argv.overwrite);
    for (const oid in importedProjektis) {
      const targetStatus = importedProjektis[oid];
      await recordProjektiTestFixture("migraatio_" + targetStatus, oid);
    }
  });
});
