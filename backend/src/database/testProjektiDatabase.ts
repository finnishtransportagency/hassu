import { config } from "../config";
import { ProjektiDatabase } from "./projektiDatabase";
import { DBProjekti } from "./model";
import { getDynamoDBDocumentClient } from "../aws/client";
import { log } from "../logger";
import { feedbackDatabase } from "./palauteDatabase";
import { lyhytOsoiteDatabase } from "./lyhytOsoiteDatabase";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";

/***
 * Luokan olemassaolo perustuu paljolti siihen, että saveProjektiInternalia kutsutaan poikkeavilla parametreilla niin,
 * että siellä kutsuttava dynamodb.UpdateItem -komento päivittää myös kentät,
 * joita saveProjektiInternal ei normaalisti päivitä eg. kuten nahtavillaoloVaiheJulkaisut (ks. projektiDatabase -> skipAutomaticUpdateFields)
 */
export class TestProjektiDatabase extends ProjektiDatabase {
  async saveProjekti(dbProjekti: Partial<DBProjekti>): Promise<number> {
    return this.saveProjektiInternal(dbProjekti, true, true);
  }

  async deleteProjektiByOid(oid: string): Promise<void> {
    if (config.env !== "prod") {
      const client = getDynamoDBDocumentClient();

      try {
        await client.send(
          new DeleteCommand({
            TableName: this.projektiTableName,
            Key: {
              oid,
            },
          })
        );
      } catch (e) {
        log.error(e);
      }

      try {
        const feedbacks = await feedbackDatabase.listFeedback(oid);
        if (feedbacks) {
          for (const feedback of feedbacks) {
            await client.send(
              new DeleteCommand({
                TableName: this.feedbackTableName,
                Key: {
                  oid,
                  id: feedback.id,
                },
              })
            );
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

export const testProjektiDatabase = new TestProjektiDatabase(config.projektiTableName ?? "missing", config.feedbackTableName ?? "missing");
