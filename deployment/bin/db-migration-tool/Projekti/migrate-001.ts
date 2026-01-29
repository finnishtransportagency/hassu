import { PagedMigrationRunPlan } from "../types";
import { TestProjektiDatabase } from "../../../../backend/src/database/testProjektiDatabase";
import { cloneDeep, isEqual } from "lodash";
import { DBProjekti } from "../../../../backend/src/database/model/projekti";
import { migrateFromOldSchema } from "../../../../backend/src/database/projektiSchemaUpdate";

const migrate001: PagedMigrationRunPlan = async (options) => {
  const projektiDatabase = new TestProjektiDatabase(options.tableName, "not-used");

  const scanResult: { startKey: string | undefined; projektis: DBProjekti[] } = await projektiDatabase.scanProjektit(
    JSON.stringify(options.startKey)
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
      `${options.dryRun ? "Would run" : "Running"} migrateFromOldSchema to the following projektis: ${JSON.stringify(
        alteredProjektis.map((projekti) => projekti.oid)
      )}`
    );
    if (!options.dryRun) {
      await projektiDatabase.saveProjekti(alteredProjekti);
    }
  }

  // Even though updateInput is empty array, it will still keep on to the next page as long as lastEvaluatedKey is defined
  return { updateInput: [], lastEvaluatedKey: scanResult.startKey ? JSON.parse(scanResult.startKey) : undefined };
};

export default migrate001;
