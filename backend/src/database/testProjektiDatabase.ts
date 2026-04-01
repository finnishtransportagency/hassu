import { config } from "../config";
import { ProjektiDatabase } from "./projektiDatabase";
import {
  DBPROJEKTI_OMITTED_FIELDS,
  SaveDBProjektiInput,
  SaveDBProjektiSlimInput,
  SaveDBProjektiSlimWithoutLockingInput,
  SaveDBProjektiWithoutLockingInput,
} from "./model";
import { getDynamoDBDocumentClient } from "../aws/client";
import { log } from "../logger";
import { feedbackDatabase } from "./palauteDatabase";
import { lyhytOsoiteDatabase } from "./lyhytOsoiteDatabase";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { nahtavillaoloVaiheJulkaisuDatabase } from "./nahtavillaoloVaiheJulkaisuDatabase";
import { Exact } from "hassu-common/specialTypes";
import omit from "lodash/omit";
import { projektiEntityDatabase } from "./projektiEntityDatabase";

/***
 * Luokan olemassaolo perustuu paljolti siihen, että saveProjektiInternalia kutsutaan poikkeavilla parametreilla niin,
 * että siellä kutsuttava dynamodb.UpdateItem -komento päivittää myös kentät,
 * joita saveProjektiInternal ei normaalisti päivitä eg. nahtavillaoloVaiheJulkaisut (ks. projektiDatabase -> skipAutomaticUpdateFields)
 */
export class TestProjektiDatabase extends ProjektiDatabase {
  protected updateDisabledAttributes = ["oid", "versio", "tallennettu"];
  feedbackTableName: string;

  constructor(projektiTableName: string, feedbackTableName: string) {
    super(projektiTableName);
    this.feedbackTableName = feedbackTableName;
  }

  /** Tallettaa erikseen myös julkaisut */
  async saveProjekti(dbProjekti: SaveDBProjektiInput): Promise<number> {
    return await this.saveSlimProjekti(omit(dbProjekti, ...DBPROJEKTI_OMITTED_FIELDS));
  }
  async saveProjektiWithoutLocking(dbProjekti: SaveDBProjektiWithoutLockingInput): Promise<number> {
    return await this.saveSlimProjektiWithoutLocking(omit(dbProjekti, ...DBPROJEKTI_OMITTED_FIELDS));
  }

  /*** forceUpdateInTests and no locking */
  async saveSlimProjekti<T extends SaveDBProjektiSlimInput>(dbProjekti: Exact<T, SaveDBProjektiSlimInput>): Promise<number> {
    return await this.saveProjektiInternal(dbProjekti, true);
  }

  /*** forceUpdateInTests and no locking */
  async saveSlimProjektiWithoutLocking<T extends SaveDBProjektiSlimWithoutLockingInput>(
    dbProjekti: Exact<T, SaveDBProjektiSlimWithoutLockingInput>
  ): Promise<number> {
    return await this.saveProjektiInternal(dbProjekti, true);
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

      try {
        const items = await nahtavillaoloVaiheJulkaisuDatabase.getAllForProjekti(oid, true);
        await nahtavillaoloVaiheJulkaisuDatabase.deleteAll(items);
      } catch (e) {
        log.error(e);
      }

      try {
        const items = await projektiEntityDatabase.getAllForProjekti(oid, true);
        await projektiEntityDatabase.deleteAll(items);
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
