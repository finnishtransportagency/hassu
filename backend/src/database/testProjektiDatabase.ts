import { config } from "../config";
import { ProjektiDatabase } from "./projektiDatabase";
import { DBProjekti } from "./model";
import { getDynamoDBDocumentClient } from "../aws/client";
import { log } from "../logger";
import { feedbackDatabase } from "./palauteDatabase";
import { lyhytOsoiteDatabase } from "./lyhytOsoiteDatabase";

export class TestProjektiDatabase extends ProjektiDatabase {
  async saveProjekti(dbProjekti: Partial<DBProjekti>): Promise<number> {
    return this.saveProjektiInternal(dbProjekti, true, true);
  }

  async deleteProjektiByOid(oid: string): Promise<void> {
    if (config.env !== "prod") {
      const client = getDynamoDBDocumentClient();

      let removeResult = await client
        .delete({
          TableName: this.projektiTableName,
          Key: {
            oid,
          },
        })
        .promise();
      this.checkAndRaiseError(removeResult.$response, "Projektin poistaminen ei onnistunut");

      try {
        const feedbacks = await feedbackDatabase.listFeedback(oid);
        if (feedbacks) {
          for (const feedback of feedbacks) {
            removeResult = await client
              .delete({
                TableName: this.feedbackTableName,
                Key: {
                  oid,
                  id: feedback.id,
                },
              })
              .promise();
            this.checkAndRaiseError(removeResult.$response, "Projektin palautteen poistaminen ei onnistunut");
          }
        }
      } catch (e) {
        log.error(e);
      }

      const lyhytOsoite = await lyhytOsoiteDatabase.getLyhytOsoite(oid);
      if (lyhytOsoite) {
        await lyhytOsoiteDatabase.deleteLyhytOsoite(lyhytOsoite);
      }
    }
  }
}

export const testProjektiDatabase = new TestProjektiDatabase(config.projektiTableName || "missing", config.feedbackTableName || "missing");
