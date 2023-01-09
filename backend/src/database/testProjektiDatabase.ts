import { config } from "../config";
import { ProjektiDatabase } from "./projektiDatabase";
import { DBProjekti } from "./model";
import { getDynamoDBDocumentClient } from "../aws/client";

export class TestProjektiDatabase extends ProjektiDatabase {
  async saveProjekti(dbProjekti: Partial<DBProjekti>): Promise<number> {
    return this.saveProjektiInternal(dbProjekti, true, true);
  }

  async deleteProjektiByOid(oid: string): Promise<void> {
    if (config.env !== "prod") {
      const client = getDynamoDBDocumentClient();

      const removeResult = await client
        .delete({
          TableName: this.projektiTableName,
          Key: {
            oid,
          },
        })
        .promise();
      this.checkAndRaiseError(removeResult.$response, "Arkistointi ei onnistunut");
    }
  }
}

export const testProjektiDatabase = new TestProjektiDatabase();
