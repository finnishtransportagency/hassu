import { PagedMigrationRunPlan } from "../types";
import { cloneDeep, isEqual } from "lodash";
import { DBProjekti } from "../../../../backend/src/database/model/projekti";
import { migrateFromOldSchema } from "../../../../backend/src/database/projektiSchemaUpdate";
import { ProjektiDatabase } from "../../../../backend/src/database/projektiDatabase";

const migrate001: PagedMigrationRunPlan = async ({ tableName, startKey, migrateOptions: { dryRun } }) => {
  const projektiDatabase = new ProjektiDatabase(tableName, "not-used");

  const scanResult: { startKey: string | undefined; projektis: DBProjekti[] } = await projektiDatabase.scanProjektit(
    JSON.stringify(startKey)
  );

  // Gathers all projektis that have changes made by migrateFromOldSchema
  const alteredProjektis: DBProjekti[] = scanResult.projektis
    .map<{ original: DBProjekti; altered: DBProjekti }>((projekti) => ({
      original: projekti,
      altered: migrateFromOldSchema(cloneDeep(projekti), true),
    }))
    .filter(({ original, altered }) => !isEqual(original, altered))
    .map(({ altered }) => altered);

  for (const alteredProjekti of alteredProjektis) {
    console.log(
      `${dryRun ? "Would run" : "Running"} migrateFromOldSchema to the following projektis: ${JSON.stringify(
        alteredProjektis.map((projekti) => projekti.oid)
      )}`
    );
    if (!dryRun) {
      await projektiDatabase.saveProjekti(alteredProjekti);
    }
  }

  // Even though updateInput is empty array, it will still keep on to the next page as long as lastEvaluatedKey is defined
  return { updateInput: [], lastEvaluatedKey: scanResult.startKey ? JSON.parse(scanResult.startKey) : undefined };
};

export default migrate001;
