import { log, setLogContextOid } from "../logger";
import {
  AloitusKuulutusJulkaisu,
  DBProjekti,
  Hyvaksymispaatos,
  HyvaksymisPaatosVaiheJulkaisu,
  KasittelynTila,
  NahtavillaoloVaiheJulkaisu,
  OmistajaHaku,
  PartialDBProjekti,
  VuorovaikutusKierrosJulkaisu,
} from "./model";
import { config } from "../config";
import { migrateFromOldSchema } from "./projektiSchemaUpdate";
import { getDynamoDBDocumentClient } from "../aws/client";
import assert from "assert";
import { SimultaneousUpdateError } from "hassu-common/error";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import {
  GetCommand,
  PutCommand,
  PutCommandOutput,
  ScanCommand,
  ScanCommandOutput,
  UpdateCommand,
  UpdateCommandInput,
  UpdateCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import { NativeAttributeValue } from "@aws-sdk/util-dynamodb";
import { FULL_DATE_TIME_FORMAT_WITH_TZ, nyt } from "../util/dateUtil";
import { AsianhallintaSynkronointi } from "@hassu/asianhallinta";
import { Status } from "hassu-common/graphql/apiModel";

const specialFields = ["oid", "versio", "tallennettu", "vuorovaikutukset"];
const skipAutomaticUpdateFields = [
  "aloitusKuulutusJulkaisut",
  "nahtavillaoloVaiheJulkaisut",
  "hyvaksymisPaatosVaiheJulkaisut",
  "julkaistuHyvaksymisEsitys",
  "jatkoPaatos1VaiheJulkaisut",
  "jatkoPaatos2VaiheJulkaisut",
  "synkronoinnit",
] as (keyof DBProjekti)[] as string[];

function createExpression(expression: string, properties: string[]) {
  return properties.length > 0 ? expression + " " + properties.join(" , ") : "";
}

type JulkaisuWithId = { id: number };

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

  async insert(oid: string, julkaisu: T): Promise<UpdateCommandOutput> {
    return await this.projektiDatabase.insertJulkaisuToList(oid, julkaisu, this.julkaisutFieldName, this.description);
  }

  async update(projekti: DBProjekti, julkaisu: T): Promise<void> {
    await this.projektiDatabase.updateJulkaisuToList(projekti, julkaisu, this.julkaisutFieldName, this.description);
  }

  async delete(projekti: DBProjekti, julkaisuIdToDelete: number): Promise<void> {
    return await this.projektiDatabase.deleteJulkaisuFromList(projekti, julkaisuIdToDelete, this.julkaisutFieldName, this.description);
  }

  async deleteAll(projekti: DBProjekti): Promise<void> {
    return await this.projektiDatabase.deleteAllJulkaisu(projekti, this.julkaisutFieldName, this.description);
  }
}

type UpdateParams = {
  setExpression: string[];
  removeExpression: string[];
  attributeNames: Record<string, string>;
  attributeValues: Record<string, NativeAttributeValue>;
  conditionExpression?: string;
};

export class ProjektiDatabase {
  constructor(projektiTableName: string, feedbackTableName: string) {
    this.projektiTableName = projektiTableName;
    this.feedbackTableName = feedbackTableName;
  }

  projektiTableName: string;
  feedbackTableName: string;

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
    if (!oid) {
      return;
    }
    setLogContextOid(oid);
    try {
      const params = new GetCommand({
        TableName: this.projektiTableName,
        Key: { oid },
        ConsistentRead: stronglyConsistentRead,
      });
      const data = await getDynamoDBDocumentClient().send(params);
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
    return await this.saveProjektiInternal(dbProjekti);
  }

  async saveProjektiWithoutLocking(dbProjekti: Partial<DBProjekti> & Pick<DBProjekti, "oid">): Promise<number> {
    return await this.saveProjektiInternal(dbProjekti, false, true);
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
      nextVersion = dbProjekti.versio ?? 0; // Value 0 should not be meaningful when locking is bypassed
    } else {
      nextVersion = this.handleOptimisticLocking(dbProjekti, updateParams);
    }

    dbProjekti.paivitetty = nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ);
    this.handleFieldsToSave(dbProjekti, updateParams, forceUpdateInTests);

    const updateExpression =
      createExpression("SET", updateParams.setExpression) + " " + createExpression("REMOVE", updateParams.removeExpression);

    const params = new UpdateCommand({
      TableName: this.projektiTableName,
      Key: {
        oid: dbProjekti.oid,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: updateParams.attributeNames,
      ExpressionAttributeValues: updateParams.attributeValues,
      ConditionExpression: updateParams.conditionExpression,
    });

    if (log.isLevelEnabled("debug")) {
      log.debug("Updating projekti to Hassu with params", { params });
    }

    try {
      const dynamoDBDocumentClient = getDynamoDBDocumentClient();
      await dynamoDBDocumentClient.send(params);
      return nextVersion;
    } catch (e) {
      if (e instanceof ConditionalCheckFailedException) {
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

  async createProjekti(projekti: DBProjekti): Promise<PutCommandOutput> {
    const params = new PutCommand({
      TableName: this.projektiTableName,
      Item: projekti,
    });
    return await getDynamoDBDocumentClient().send(params);
  }

  async scanProjektit(startKey?: string): Promise<{ startKey: string | undefined; projektis: DBProjekti[] }> {
    try {
      const params = new ScanCommand({
        TableName: this.projektiTableName,
        Limit: 10,
        ExclusiveStartKey: startKey ? JSON.parse(startKey) : undefined,
      });
      const data: ScanCommandOutput = await getDynamoDBDocumentClient().send(params);
      return {
        projektis: data.Items as DBProjekti[],
        startKey: data.LastEvaluatedKey ? JSON.stringify(data.LastEvaluatedKey) : undefined,
      };
    } catch (e) {
      log.error(e);
      throw e;
    }
  }

  async setNewFeedbacksFlagOnProject(oid: string): Promise<void> {
    log.info("setNewFeedbacksFlagOnProject", { oid });

    const params = new UpdateCommand({
      TableName: this.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression: "SET uusiaPalautteita = :one",
      ExpressionAttributeValues: { ":one": 1 },
    });
    await getDynamoDBDocumentClient().send(params);
  }

  async appendMuistuttajatList(oid: string, ids: string[], muutMuistuttajat = false): Promise<void> {
    log.info("appendMuistuttajatList", { oid, ids, muutMuistuttajat });
    const params = new UpdateCommand({
      TableName: this.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression: "SET #m = list_append(if_not_exists(#m, :tyhjalista), :id)",
      ExpressionAttributeNames: { "#m": muutMuistuttajat ? "muutMuistuttajat" : "muistuttajat" },
      ExpressionAttributeValues: { ":id": ids, ":tyhjalista": [] },
    });
    await getDynamoDBDocumentClient().send(params);
  }

  async clearNewFeedbacksFlagOnProject(oid: string): Promise<void> {
    log.info("clearNewFeedbacksFlagOnProject", { oid });

    const params = new UpdateCommand({
      TableName: this.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression: "REMOVE uusiaPalautteita",
    });
    await getDynamoDBDocumentClient().send(params);
  }

  async findProjektiOidsWithNewFeedback(): Promise<string[]> {
    const result: string[] = [];

    try {
      let lastEvaluatedKey = undefined;
      do {
        const params = new ScanCommand({
          TableName: this.projektiTableName,
          IndexName: "UusiaPalautteitaIndex",
          Limit: 10,
          ExclusiveStartKey: lastEvaluatedKey,
        });
        const data: ScanCommandOutput = await getDynamoDBDocumentClient().send(params);
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
    const params = new UpdateCommand({
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
    });
    log.info("Inserting " + description + " to projekti", { oid });
    return getDynamoDBDocumentClient().send(params);
  }

  async updateJulkaisuToList(projekti: DBProjekti, julkaisu: JulkaisuWithId, listFieldName: JulkaisutFieldName, description: string) {
    const julkaisut = projekti[listFieldName];
    if (!julkaisut) {
      return;
    }
    const oid = projekti.oid;
    for (let idx = 0; idx < julkaisut.length; idx++) {
      if (julkaisut[idx].id == julkaisu.id) {
        const params = new UpdateCommand({
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
        });
        log.info("Updating " + description + " to projekti", { julkaisu });
        await getDynamoDBDocumentClient().send(params);
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
        await getDynamoDBDocumentClient().send(new UpdateCommand(params));
        break;
      }
    }
  }

  async deleteAllJulkaisu(projekti: DBProjekti, listFieldName: JulkaisutFieldName, description: string): Promise<void> {
    const julkaisut = projekti[listFieldName];
    if (!julkaisut) {
      return;
    }
    const oid = projekti.oid;
    log.info("delete " + description);

    const params = {
      TableName: this.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression: "REMOVE #" + listFieldName,
      ExpressionAttributeNames: {
        ["#" + listFieldName]: listFieldName,
      },
    };
    await getDynamoDBDocumentClient().send(new UpdateCommand(params));
  }

  async setAsianhallintaSynkronointi(oid: string, synkronointi: AsianhallintaSynkronointi): Promise<void> {
    // Varmista ensin, että synkronoinnit-map on olemassa
    await getDynamoDBDocumentClient().send(
      new UpdateCommand({
        TableName: this.projektiTableName,
        Key: {
          oid,
        },
        UpdateExpression: "SET synkronoinnit = if_not_exists(#synkronoinnit, :empty_map)",
        ExpressionAttributeNames: {
          ["#synkronoinnit"]: "synkronoinnit",
        },
        ExpressionAttributeValues: {
          ":empty_map": {},
        },
      })
    );
    // Lisää synkronointi synkronoinnit-map:iin
    await getDynamoDBDocumentClient().send(
      new UpdateCommand({
        TableName: this.projektiTableName,
        Key: {
          oid,
        },
        UpdateExpression: "set synkronoinnit.#asianhallintaEventId = :synkronointi", //NOSONAR
        ExpressionAttributeNames: {
          ["#asianhallintaEventId"]: synkronointi.asianhallintaEventId, //NOSONAR
        },
        ExpressionAttributeValues: {
          ":synkronointi": synkronointi,
        },
      })
    );
  }

  async setOmistajahakuTiedot(
    oid: string,
    omistajahakuKaynnistetty: string | null,
    omistajahakuVirhe: boolean,
    kiinteistotunnusMaara: number | null,
    status: Status | null = null
  ) {
    const omistajahaku: OmistajaHaku = {
      kaynnistetty: omistajahakuKaynnistetty,
      kiinteistotunnusMaara,
      virhe: omistajahakuVirhe,
      status,
    };
    const params = new UpdateCommand({
      TableName: this.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression: "SET #omistajahaku = :omistajahaku",
      ExpressionAttributeNames: {
        ["#omistajahaku"]: "omistajahaku",
      },
      ExpressionAttributeValues: {
        ":omistajahaku": omistajahaku,
      },
    });
    return await getDynamoDBDocumentClient().send(params);
  }

  async setMuutMuistuttajat(oid: string, muutMuistuttajat: string[]) {
    const params = new UpdateCommand({
      TableName: this.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression: "SET #muutMuistuttajat = :muutMuistuttajat",
      ExpressionAttributeNames: {
        ["#muutMuistuttajat"]: "muutMuistuttajat",
      },
      ExpressionAttributeValues: {
        ":muutMuistuttajat": muutMuistuttajat,
      },
    });
    return await getDynamoDBDocumentClient().send(params);
  }

  async aktivoiProjektiJatkopaatettavaksi(
    oid: string,
    versio: number,
    vaiheAvain: keyof Pick<KasittelynTila, "ensimmainenJatkopaatos" | "toinenJatkopaatos">,
    paatoksenTiedot: Hyvaksymispaatos
  ) {
    const paatosInput: UpdateCommandInput = {
      TableName: this.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression: `ADD #versio :one SET kasittelynTila.#paatos = :paatos`,
      ExpressionAttributeNames: {
        ["#paatos"]: vaiheAvain,
        ["#versio"]: "versio",
      },
      ExpressionAttributeValues: {
        ":paatos": paatoksenTiedot,
        ":versio": versio,
        ":one": 1,
      },
      ConditionExpression: "(attribute_not_exists(#versio) OR #versio = :versio) AND attribute_exists(kasittelynTila)",
    };
    const kasittelynTilaInput: UpdateCommandInput = {
      TableName: this.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression: "ADD #versio :one SET kasittelynTila = if_not_exists(kasittelynTila, :kasittelynTila)",
      ExpressionAttributeNames: {
        ["#versio"]: "versio",
      },
      ExpressionAttributeValues: {
        ":kasittelynTila": { [vaiheAvain]: paatoksenTiedot },
        ":versio": versio,
        ":one": 1,
      },
      ConditionExpression: "attribute_not_exists(#versio) OR #versio = :versio",
    };
    try {
      await getDynamoDBDocumentClient().send(new UpdateCommand(paatosInput));
      return;
    } catch (e) {
      if (!(e instanceof ConditionalCheckFailedException)) {
        log.error(e instanceof Error ? e.message : String(e), { paatosInput });
        throw e;
      }
    }
    try {
      await getDynamoDBDocumentClient().send(new UpdateCommand(kasittelynTilaInput));
    } catch (e) {
      if (e instanceof ConditionalCheckFailedException) {
        throw new SimultaneousUpdateError("Projektia on päivitetty tietokannassa. Lataa projekti uudelleen.");
      }
      log.error(e instanceof Error ? e.message : String(e), { kasittelynTilaInput });
      throw e;
    }
  }
}

export const projektiDatabase = new ProjektiDatabase(config.projektiTableName ?? "missing", config.feedbackTableName ?? "missing");
