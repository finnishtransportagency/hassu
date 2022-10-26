import { log } from "../logger";
import { AloitusKuulutusJulkaisu, DBProjekti, HyvaksymisPaatosVaiheJulkaisu, NahtavillaoloVaiheJulkaisu } from "./model";
import { config } from "../config";
import { getDynamoDBDocumentClient } from "./dynamoDB";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import { AWSError } from "aws-sdk/lib/error";
import { Response } from "aws-sdk/lib/response";
import dayjs from "dayjs";
import { migrateFromOldSchema } from "./schemaUpgrade";

const specialFields = ["oid", "tallennettu", "vuorovaikutukset"];
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
  | "nahtavillaoloVaiheJulkaisut"
  | "hyvaksymisPaatosVaiheJulkaisut"
  | "jatkoPaatos1VaiheJulkaisut"
  | "jatkoPaatos2VaiheJulkaisut"
>;

export class JulkaisuFunctions<T extends AloitusKuulutusJulkaisu | HyvaksymisPaatosVaiheJulkaisu | NahtavillaoloVaiheJulkaisu> {
  private julkaisutFieldName: JulkaisutFieldName;
  private description: string;
  private projektiDatabase: ProjektiDatabase;

  constructor(projektiDatabase: ProjektiDatabase, julkaisutFieldName: JulkaisutFieldName, description: string) {
    this.projektiDatabase = projektiDatabase;
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

export class ProjektiDatabase {
  projektiTableName: string = config.projektiTableName || "missing";

  aloitusKuulutusJulkaisut = new JulkaisuFunctions<AloitusKuulutusJulkaisu>(this, "aloitusKuulutusJulkaisut", "AloitusKuulutusJulkaisu");
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

  async saveProjekti(dbProjekti: Partial<DBProjekti>): Promise<DocumentClient.UpdateItemOutput> {
    return this.saveProjektiInternal(dbProjekti);
  }

  /**
   *
   * @param dbProjekti Projekti, joka päivitetään tietokantaan
   * @param forceUpdateInTests Salli kaikkien kenttien päivittäminen. Sallittua käyttää vain testeissä.
   */
  protected async saveProjektiInternal(
    dbProjekti: Partial<DBProjekti>,
    forceUpdateInTests = false
  ): Promise<DocumentClient.UpdateItemOutput> {
    if (log.isLevelEnabled("debug")) {
      log.debug("Updating projekti to Hassu", { projekti: dbProjekti });
    } else {
      log.info("Updating projekti to Hassu", { oid: dbProjekti.oid });
    }
    const setExpression: string[] = [];
    const removeExpression: string[] = [];
    const ExpressionAttributeNames: DocumentClient.ExpressionAttributeNameMap = {};
    const ExpressionAttributeValues: DocumentClient.ExpressionAttributeValueMap = {};

    dbProjekti.paivitetty = dayjs().format();

    for (const property in dbProjekti) {
      if (specialFields.includes(property) || (skipAutomaticUpdateFields.includes(property) && !forceUpdateInTests)) {
        continue;
      }
      const value = dbProjekti[property as keyof DBProjekti];
      if (value === undefined) {
        continue;
      }
      if (value === null) {
        removeExpression.push(property);
      } else {
        setExpression.push(`#${property} = :${property}`);
        ExpressionAttributeNames["#" + property] = property;
        ExpressionAttributeValues[":" + property] = value;
      }
    }

    if (dbProjekti.vuorovaikutukset === null) {
      // For testing purposes
      setExpression.push("vuorovaikutukset = :emptyList");
      ExpressionAttributeValues[":emptyList"] = [];
    } else if (dbProjekti.vuorovaikutukset && dbProjekti.vuorovaikutukset.length > 0) {
      if (dbProjekti.vuorovaikutukset.length > 1) {
        throw new Error("Voit tallentaa vain yhden vuorovaikutuksen kerrallaan");
      }
      const vuorovaikutus = dbProjekti.vuorovaikutukset[0];
      setExpression.push(`#vuorovaikutukset[${vuorovaikutus.vuorovaikutusNumero - 1}] = :vuorovaikutus`);
      ExpressionAttributeNames["#vuorovaikutukset"] = "vuorovaikutukset";
      ExpressionAttributeValues[":vuorovaikutus"] = vuorovaikutus;
    } else {
      setExpression.push("vuorovaikutukset = if_not_exists(vuorovaikutukset, :emptyList)");
      ExpressionAttributeValues[":emptyList"] = [];
    }

    const updateExpression = createExpression("SET", setExpression) + " " + createExpression("REMOVE", removeExpression);

    const params = {
      TableName: this.projektiTableName,
      Key: {
        oid: dbProjekti.oid,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    };

    if (log.isLevelEnabled("debug")) {
      log.debug("Updating projekti to Hassu with params", { params });
    }

    try {
      return await getDynamoDBDocumentClient().update(params).promise();
    } catch (e) {
      log.error(e instanceof Error ? e.message : String(e), { params });
      throw e;
    }
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
    log.info("Insert " + description, { oid, julkaisu });
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
    log.info("Inserting " + description + " to projekti", { params });
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
