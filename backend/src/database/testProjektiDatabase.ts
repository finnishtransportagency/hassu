import { config } from "../config";
import { getDynamoDBDocumentClient } from "./dynamoDB";
import { ProjektiDatabase } from "./projektiDatabase";
import { DBProjekti } from "./model";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";

export class TestProjektiDatabase extends ProjektiDatabase {
  async saveProjekti(dbProjekti: Partial<DBProjekti>): Promise<DocumentClient.UpdateItemOutput> {
    return this.saveProjektiInternal(dbProjekti, true);
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
