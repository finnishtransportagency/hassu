import { PagedMigrationRunPlan } from "../types";
import { cloneDeep, isEqual } from "lodash";
import { DBProjekti } from "../../../../backend/src/database/model/projekti";
import { migrateFromOldSchema } from "../../../../backend/src/database/projektiSchemaUpdate";
import { TestProjektiDatabase } from "../../../../backend/src/database/testProjektiDatabase";

const migrate002: PagedMigrationRunPlan = async ({ tableName, startKey, migrateOptions: { dryRun } }) => {
  /**
   * Huom! TestProjektiDatabase (eikä ProjektiDatabase), jotta päivitetään myös kentät,
   * jotka normaalisti jäisi tallentamatta saveProjekti kutsulla (kuten nahtavillaoloVaiheJulkaisut) ks.
   * */
  const projektiDatabase = new TestProjektiDatabase(tableName, "not-used");

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

export default migrate002;
