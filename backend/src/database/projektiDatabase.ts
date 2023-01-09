import { log, setLogContextOid } from "../logger";
import {
  AloitusKuulutusJulkaisu,
  DBProjekti,
  HyvaksymisPaatosVaiheJulkaisu,
  NahtavillaoloVaiheJulkaisu,
  PartialDBProjekti,
  VuorovaikutusKierrosJulkaisu,
} from "./model";
import { config } from "../config";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import { AWSError } from "aws-sdk/lib/error";
import { Response } from "aws-sdk/lib/response";
import dayjs from "dayjs";
import { migrateFromOldSchema } from "./schemaUpgrade";
import { getDynamoDBDocumentClient } from "../aws/client";
import assert from "assert";
import { SimultaneousUpdateError } from "../error/SimultaneousUpdateError";

const specialFields = ["oid", "versio", "tallennettu", "vuorovaikutukset"];
const skipAutomaticUpdateFields = [
  "aloitusKuulutusJulkaisut",
  "nahtavillaoloVaiheJulkaisut",
  "hyvaksymisPaatosVaiheJulkaisut",
] as (keyof DBProjekti)[] as string[];

function createExpression(expression: string, properties: string[]) {
  return properties.length > 0 ? expression + " " + properties.join(" , ") : "";
}

type JulkaisuWithId = { id: number } & unknown;

type JulkaisutFieldName = keyof Pick<
  DBProjekti,
  | "aloitusKuulutusJulkaisut"
  | "vuorovaikutusKierrosJulkaisut"
  | "nahtavillaoloVaiheJulkaisut"
  | "hyvaksymisPaatosVaiheJulkaisut"
  | "jatkoPaatos1VaiheJulkaisut"
  | "jatkoPaatos2VaiheJulkaisut"
>;

export class JulkaisuFunctions<
  T extends AloitusKuulutusJulkaisu | VuorovaikutusKierrosJulkaisu | HyvaksymisPaatosVaiheJulkaisu | NahtavillaoloVaiheJulkaisu
> {
  private julkaisutFieldName: JulkaisutFieldName;
  private description: string;
  private projektiDatabase: ProjektiDatabase;

  constructor(database: ProjektiDatabase, julkaisutFieldName: JulkaisutFieldName, description: string) {
    this.projektiDatabase = database;
    this.julkaisutFieldName = julkaisutFieldName;
    this.description = description;
  }

  async insert(oid: string, julkaisu: T): Promise<DocumentClient.UpdateItemOutput> {
    return this.projektiDatabase.insertJulkaisuToList(oid, julkaisu, this.julkaisutFieldName, this.description);
  }

  async update(projekti: DBProjekti, julkaisu: T): Promise<void> {
    await this.projektiDatabase.updateJulkaisuToList(projekti, julkaisu, this.julkaisutFieldName, this.description);
  }

  async delete(projekti: DBProjekti, julkaisuIdToDelete: number): Promise<void> {
    return this.projektiDatabase.deleteJulkaisuFromList(projekti, julkaisuIdToDelete, this.julkaisutFieldName, this.description);
  }
}

type UpdateParams = {
  setExpression: string[];
  removeExpression: string[];
  attributeNames: DocumentClient.ExpressionAttributeNameMap;
  attributeValues: DocumentClient.ExpressionAttributeValueMap;
  conditionExpression?: string;
};

export class ProjektiDatabase {
  projektiTableName: string = config.projektiTableName || "missing";

  aloitusKuulutusJulkaisut = new JulkaisuFunctions<AloitusKuulutusJulkaisu>(this, "aloitusKuulutusJulkaisut", "AloitusKuulutusJulkaisu");
  vuorovaikutusKierrosJulkaisut = new JulkaisuFunctions<VuorovaikutusKierrosJulkaisu>(
    this,
    "vuorovaikutusKierrosJulkaisut",
    "VuorovaikutusKierrosJulkaisu"
  );
  nahtavillaoloVaiheJulkaisut = new JulkaisuFunctions<NahtavillaoloVaiheJulkaisu>(
    this,
    "nahtavillaoloVaiheJulkaisut",
    "NahtavillaoloVaiheJulkaisu"
  );
  hyvaksymisPaatosVaiheJulkaisut = new JulkaisuFunctions<HyvaksymisPaatosVaiheJulkaisu>(
    this,
    "hyvaksymisPaatosVaiheJulkaisut",
    "HyvaksymisPaatosVaiheJulkaisu"
  );
  jatkoPaatos1VaiheJulkaisut = new JulkaisuFunctions<HyvaksymisPaatosVaiheJulkaisu>(
    this,
    "jatkoPaatos1VaiheJulkaisut",
    "JatkoPaatos1VaiheJulkaisu"
  );
  jatkoPaatos2VaiheJulkaisut = new JulkaisuFunctions<HyvaksymisPaatosVaiheJulkaisu>(
    this,
    "jatkoPaatos2VaiheJulkaisut",
    "JatkoPaatos2VaiheJulkaisu"
  );

  /**
   * Load projekti from DynamoDB
   * @param oid Projekti oid
   * @param stronglyConsistentRead Use stringly consistent read operation to DynamoDB. Set "false" in public website to save database capacity.
   */
  async loadProjektiByOid(oid: string, stronglyConsistentRead = true): Promise<DBProjekti | undefined> {
    setLogContextOid(oid);
    try {
      const params: DocumentClient.GetItemInput = {
        TableName: this.projektiTableName,
        Key: { oid },
        ConsistentRead: stronglyConsistentRead,
      };
      const data = await getDynamoDBDocumentClient().get(params).promise();
      if (!data.Item) {
        return;
      }
      const projekti = data.Item as DBProjekti;
      projekti.oid = oid;
      projekti.tallennettu = true;

      return migrateFromOldSchema(projekti);
    } catch (e) {
      if ((e as { code: string }).code === "ResourceNotFoundException") {
        log.warn("projektia ei löydy", { oid });
        return undefined;
      }
      log.error(e);
      throw e;
    }
  }

  /**
   *
   * @param dbProjekti Tallennettava projekti
   * @return tallennetun projektin versio
   */
  async saveProjekti(dbProjekti: PartialDBProjekti): Promise<number> {
    return this.saveProjektiInternal(dbProjekti);
  }

  async saveProjektiWithoutLocking(dbProjekti: Partial<DBProjekti> & Pick<DBProjekti, "oid">): Promise<number> {
    return this.saveProjektiInternal(dbProjekti, false, true);
  }

  /**
   *
   * @param dbProjekti Projekti, joka päivitetään tietokantaan
   * @param forceUpdateInTests Salli kaikkien kenttien päivittäminen. Sallittua käyttää vain testeissä.
   * @param bypassLocking Ohita projektin lukitusmekanismi. Voidaan käyttää päivityksissä, jotka eivät liity käytt
   */
  protected async saveProjektiInternal(
    dbProjekti: Partial<DBProjekti>,
    forceUpdateInTests = false,
    bypassLocking = false
  ): Promise<number> {
    if (log.isLevelEnabled("debug")) {
      log.debug("Updating projekti to Hassu", { projekti: dbProjekti });
    } else {
      log.info("Updating projekti to Hassu", { oid: dbProjekti.oid });
    }

    const updateParams: UpdateParams = {
      setExpression: [],
      removeExpression: [],
      attributeNames: {},
      attributeValues: {},
    };

    let nextVersion: number;
    if (bypassLocking) {
      nextVersion = dbProjekti.versio || 0; // Value 0 should not be meaningful when locking is bypassed
    } else {
      nextVersion = this.handleOptimisticLocking(dbProjekti, updateParams);
    }

    dbProjekti.paivitetty = dayjs().format();
    this.handleFieldsToSave(dbProjekti, updateParams, forceUpdateInTests);

    const updateExpression =
      createExpression("SET", updateParams.setExpression) + " " + createExpression("REMOVE", updateParams.removeExpression);

    const params: DocumentClient.UpdateItemInput = {
      TableName: this.projektiTableName,
      Key: {
        oid: dbProjekti.oid,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: updateParams.attributeNames,
      ExpressionAttributeValues: updateParams.attributeValues,
      ConditionExpression: updateParams.conditionExpression,
    };

    if (log.isLevelEnabled("debug")) {
      log.debug("Updating projekti to Hassu with params", { params });
    }

    try {
      const dynamoDBDocumentClient = getDynamoDBDocumentClient();
      await dynamoDBDocumentClient.update(params).promise();
      return nextVersion;
    } catch (e) {
      if ((e as AWSError).code == "ConditionalCheckFailedException") {
        throw new SimultaneousUpdateError("Projektia on päivitetty tietokannassa. Lataa projekti uudelleen.");
      }
      log.error(e instanceof Error ? e.message : String(e), { params });
      throw e;
    }
  }

  private handleFieldsToSave(dbProjekti: Partial<DBProjekti>, updateParams: UpdateParams, forceUpdateInTests: boolean) {
    for (const property in dbProjekti) {
      if (specialFields.includes(property) || (skipAutomaticUpdateFields.includes(property) && !forceUpdateInTests)) {
        continue;
      }
      const value = dbProjekti[property as keyof DBProjekti];
      if (value === undefined) {
        continue;
      }
      if (value === null) {
        updateParams.removeExpression.push(property);
      } else {
        updateParams.setExpression.push(`#${property} = :${property}`);
        updateParams.attributeNames["#" + property] = property;
        updateParams.attributeValues[":" + property] = value;
      }
    }
  }

  private handleOptimisticLocking(dbProjekti: Partial<DBProjekti>, updateParams: UpdateParams) {
    const versioFromInput = dbProjekti.versio;
    if (!versioFromInput) {
      assert(versioFromInput, "projektin versio pitää olla tallennettaessa asetettu");
    }
    const nextVersion = versioFromInput + 1;
    updateParams.attributeNames["#versio"] = "versio";

    updateParams.conditionExpression = "attribute_not_exists(#versio) OR #versio = :versioFromInput";
    updateParams.attributeValues[":versioFromInput"] = versioFromInput;

    updateParams.setExpression.push("#versio = :versio");
    updateParams.attributeValues[":versio"] = nextVersion;
    return nextVersion;
  }

  async createProjekti(projekti: DBProjekti): Promise<DocumentClient.PutItemOutput> {
    const params: DocumentClient.PutItemInput = {
      TableName: this.projektiTableName,
      Item: projekti,
    };
    return getDynamoDBDocumentClient().put(params).promise();
  }

  async scanProjektit(startKey?: string): Promise<{ startKey: string | undefined; projektis: DBProjekti[] }> {
    try {
      const params: DocumentClient.ScanInput = {
        TableName: this.projektiTableName,
        Limit: 10,
        ExclusiveStartKey: startKey ? JSON.parse(startKey) : undefined,
      };
      const data: DocumentClient.ScanOutput = await getDynamoDBDocumentClient().scan(params).promise();
      return {
        projektis: data.Items as DBProjekti[],
        startKey: data.LastEvaluatedKey ? JSON.stringify(data.LastEvaluatedKey) : undefined,
      };
    } catch (e) {
      log.error(e);
      throw e;
    }
  }

  async clearNewFeedbacksFlagOnProject(oid: string): Promise<void> {
    log.info("clearNewFeedbacksFlagOnProject", { oid });

    const params = {
      TableName: this.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression: "REMOVE uusiaPalautteita",
    };
    await getDynamoDBDocumentClient().update(params).promise();
  }

  async findProjektiOidsWithNewFeedback(): Promise<string[]> {
    const result: string[] = [];

    try {
      let lastEvaluatedKey = undefined;
      do {
        const params: DocumentClient.ScanInput = {
          TableName: this.projektiTableName,
          IndexName: "UusiaPalautteitaIndex",
          Limit: 10,
          ExclusiveStartKey: lastEvaluatedKey,
        };
        const data: DocumentClient.ScanOutput = await getDynamoDBDocumentClient().scan(params).promise();
        if (!data?.Items) {
          break;
        }
        data.Items.forEach((item) => result.push(item.oid));
        lastEvaluatedKey = data.LastEvaluatedKey;
      } while (lastEvaluatedKey);
    } catch (e) {
      log.error(e);
      throw e;
    }

    return result;
  }

  async insertJulkaisuToList(oid: string, julkaisu: unknown, listFieldName: JulkaisutFieldName, description: string) {
    log.info("Insert " + description, { oid });
    const params = {
      TableName: this.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression: `SET #${listFieldName} = list_append(if_not_exists(#${listFieldName}, :empty_list), :julkaisu)`,
      ExpressionAttributeNames: {
        [`#${listFieldName}`]: listFieldName,
      },
      ExpressionAttributeValues: {
        ":julkaisu": [julkaisu],
        ":empty_list": [],
      },
    };
    log.info("Inserting " + description + " to projekti", { oid });
    return getDynamoDBDocumentClient().update(params).promise();
  }

  async updateJulkaisuToList(projekti: DBProjekti, julkaisu: JulkaisuWithId, listFieldName: JulkaisutFieldName, description: string) {
    const julkaisut = projekti[listFieldName];
    if (!julkaisut) {
      return;
    }
    const oid = projekti.oid;
    for (let idx = 0; idx < julkaisut.length; idx++) {
      if (julkaisut[idx].id == julkaisu.id) {
        log.info("update " + description, { idx, julkaisu });

        const params = {
          TableName: this.projektiTableName,
          Key: {
            oid,
          },
          UpdateExpression: "SET #" + listFieldName + "[" + idx + "] = :julkaisu",
          ExpressionAttributeNames: {
            ["#" + listFieldName]: listFieldName,
          },
          ExpressionAttributeValues: {
            ":julkaisu": julkaisu,
          },
        };
        log.info("Updating " + description + " to projekti", { params });
        await getDynamoDBDocumentClient().update(params).promise();
        break;
      }
    }
  }

  async deleteJulkaisuFromList(
    projekti: DBProjekti,
    julkaisuIdToDelete: number,
    listFieldName: JulkaisutFieldName,
    description: string
  ): Promise<void> {
    const julkaisut = projekti[listFieldName];
    if (!julkaisut) {
      return;
    }
    const oid = projekti.oid;
    for (let idx = 0; idx < julkaisut.length; idx++) {
      if (julkaisut[idx].id == julkaisuIdToDelete) {
        log.info("delete " + description, { idx, julkaisuIdToDelete });

        const params = {
          TableName: this.projektiTableName,
          Key: {
            oid,
          },
          UpdateExpression: "REMOVE #" + listFieldName + "[" + idx + "]",
          ExpressionAttributeNames: {
            ["#" + listFieldName]: listFieldName,
          },
        };
        await getDynamoDBDocumentClient().update(params).promise();
        break;
      }
    }
  }

  protected checkAndRaiseError<T>(response: Response<T, AWSError>, msg: string): void {
    if (response.error) {
      log.error(msg, { error: response.error });
      throw new Error(msg);
    }
  }
}

export const projektiDatabase = new ProjektiDatabase();
