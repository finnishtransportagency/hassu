import { config } from "../config";
import { ProjektiDatabase } from "./projektiDatabase";
import { SaveDBProjektiInput } from "./model";
import { getDynamoDBDocumentClient } from "../aws/client";
import { log } from "../logger";
import { feedbackDatabase } from "./palauteDatabase";
import { lyhytOsoiteDatabase } from "./lyhytOsoiteDatabase";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { Exact } from "./Exact";

export class TestProjektiDatabase extends ProjektiDatabase {
  feedbackTableName: string;

  constructor(projektiTableName: string, feedbackTableName: string) {
    super(projektiTableName);
    this.feedbackTableName = feedbackTableName;
  }

  async saveProjekti<T extends SaveDBProjektiInput>(dbProjekti: Exact<T, SaveDBProjektiInput>): Promise<number> {
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
