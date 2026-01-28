import { PagedMigrationRunPlan } from "../types";
import { TestProjektiDatabase } from "../../../../backend/src/database/testProjektiDatabase";
import { cloneDeep } from "lodash";
import { DBProjekti } from "../../../../backend/src/database/model/projekti";
import { migrateFromOldSchema } from "../../../../backend/src/database/projektiSchemaUpdate";

const migrate002: PagedMigrationRunPlan = async (options) => {
  const projektiDatabase = new TestProjektiDatabase(options.tableName, "not-used");

  const scanResult: { startKey: string | undefined; projektis: DBProjekti[] } = await projektiDatabase.scanProjektit(
    JSON.stringify(options.startKey)
  );

  const fixedProjektis = scanResult.projektis.map((projekti) =>
    migrateFromOldSchema(cloneDeep({ ...projekti, schemaVersion: options.versionId }), true)
  );
  console.log(
    `${options.dryRun ? "Would run" : "Running"} migrateFromOldSchema to the following projektis: ${JSON.stringify(
      fixedProjektis.map((projekti) => projekti.oid)
    )}`
  );
  if (!options.dryRun) {
    for (const fixed of fixedProjektis) {
      await projektiDatabase.saveProjekti(fixed);
    }
  }

  return { updateInput: [], lastEvaluatedKey: scanResult.startKey ? JSON.parse(scanResult.startKey) : undefined };
};

export default migrate002;
