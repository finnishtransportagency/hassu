import { log, setLogContextOid } from "../../logger";
import {
  Aineisto,
  AloitusKuulutusJulkaisu,
  DBProjekti,
  HyvaksymisPaatosVaiheJulkaisu,
  LadattuTiedosto,
  NahtavillaoloVaiheJulkaisu,
  VuorovaikutusKierrosJulkaisu,
} from "../../database/model";
import { config } from "../../config";
import { getDynamoDBDocumentClient } from "../../aws/client";
import {
  GetCommand,
  PutCommand,
  PutCommandOutput,
  ScanCommand,
  ScanCommandOutput,
  UpdateCommand,
  UpdateCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import { nyt } from "../../util/dateUtil";
import { AsianhallintaSynkronointi } from "@hassu/asianhallinta";
import { migrateFromOldSchema } from "../../database/projektiSchemaUpdate";
import { saveAineistotOrTiedostot } from "./saveAineistotOrTiedostot";

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
    return this.projektiDatabase.insertJulkaisuToList(oid, julkaisu, this.julkaisutFieldName, this.description);
  }

  async update(projekti: DBProjekti, julkaisu: T): Promise<void> {
    await this.projektiDatabase.updateJulkaisuToList(projekti, julkaisu, this.julkaisutFieldName, this.description);
  }

  async delete(projekti: DBProjekti, julkaisuIdToDelete: number): Promise<void> {
    return this.projektiDatabase.deleteJulkaisuFromList(projekti, julkaisuIdToDelete, this.julkaisutFieldName, this.description);
  }

  async deleteAll(projekti: DBProjekti): Promise<void> {
    return this.projektiDatabase.deleteAllJulkaisu(projekti, this.julkaisutFieldName, this.description);
  }
}

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

  async createProjekti(projekti: DBProjekti): Promise<PutCommandOutput> {
    const params = new PutCommand({
      TableName: this.projektiTableName,
      Item: projekti,
    });
    return getDynamoDBDocumentClient().send(params);
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

  async appendMuistutusTimestampList(oid: string): Promise<void> {
    log.info("appendMuistutusTimestampList", { oid });
    const timestamp = nyt().toISOString();

    const params = new UpdateCommand({
      TableName: this.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression: "SET #am = list_append(if_not_exists(#am, :tyhjalista), :timestamp)",
      ExpressionAttributeNames: { "#am": "annetutMuistutukset" },
      ExpressionAttributeValues: { ":timestamp": [timestamp], ":tyhjalista": [] },
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
        UpdateExpression: "set synkronoinnit.#asianhallintaEventId = :synkronointi",
        ExpressionAttributeNames: {
          ["#asianhallintaEventId"]: synkronointi.asianhallintaEventId,
        },
        ExpressionAttributeValues: {
          ":synkronointi": synkronointi,
        },
      })
    );
  }

  //

  public async saveSuunnitteluvaiheAineistot({
    oid,
    projektiVersio,
    uusiAineistot,
  }: {
    oid: string;
    projektiVersio: number;
    uusiAineistot: Array<Aineisto>;
  }): Promise<void> {
    return saveAineistotOrTiedostot({
      projektiTableName: this.projektiTableName,
      oid,
      projektiVersio,
      uusiAineistot,
      pathToAineistot: "vuorovaikutusKierros.aineistot",
    });
  }

  public async saveNahtavillaoloAineistotNahtavilla({
    oid,
    projektiVersio,
    uusiAineistot,
  }: {
    oid: string;
    projektiVersio: number;
    uusiAineistot: Array<Aineisto>;
  }): Promise<void> {
    return saveAineistotOrTiedostot({
      projektiTableName: this.projektiTableName,
      oid,
      projektiVersio,
      uusiAineistot,
      pathToAineistot: "nahtavillaoloVaihe.aineistoNahtavilla",
    });
  }

  public async saveLausuntoPyyntoLisaAineistot({
    oid,
    projektiVersio,
    lausuntoPyyntoIndex,
    uusiAineistot,
  }: {
    oid: string;
    projektiVersio: number;
    lausuntoPyyntoIndex: number;
    uusiAineistot: Array<LadattuTiedosto>;
  }): Promise<void> {
    return saveAineistotOrTiedostot({
      projektiTableName: this.projektiTableName,
      oid,
      projektiVersio,
      uusiAineistot,
      pathToAineistot: `lausuntoPyynnot.[${lausuntoPyyntoIndex}].lisaAineistot`,
    });
  }

  public async saveLausuntoPyynnonTaydennysMuuAineisto({
    oid,
    projektiVersio,
    lausuntoPyynnonTaydennysIndex,
    uusiAineistot,
  }: {
    oid: string;
    projektiVersio: number;
    lausuntoPyynnonTaydennysIndex: number;
    uusiAineistot: Array<LadattuTiedosto>;
  }): Promise<void> {
    return saveAineistotOrTiedostot({
      projektiTableName: this.projektiTableName,
      oid,
      projektiVersio,
      uusiAineistot,
      pathToAineistot: `lausuntoPyynnonTaydennykset.[${lausuntoPyynnonTaydennysIndex}].muuAineisto`,
    });
  }

  public async saveLausuntoPyynnonTaydennysMuistutukset({
    oid,
    projektiVersio,
    lausuntoPyynnonTaydennysIndex,
    uusiAineistot,
  }: {
    oid: string;
    projektiVersio: number;
    lausuntoPyynnonTaydennysIndex: number;
    uusiAineistot: Array<LadattuTiedosto>;
  }): Promise<void> {
    return saveAineistotOrTiedostot({
      projektiTableName: this.projektiTableName,
      oid,
      projektiVersio,
      uusiAineistot,
      pathToAineistot: `lausuntoPyynnonTaydennykset.[${lausuntoPyynnonTaydennysIndex}].muistutukset`,
    });
  }

  public async saveHyvaksymisPaatosVaiheAineistotNahtavilla({
    oid,
    projektiVersio,
    uusiAineistot,
  }: {
    oid: string;
    projektiVersio: number;
    uusiAineistot: Array<Aineisto>;
  }): Promise<void> {
    return saveAineistotOrTiedostot({
      projektiTableName: this.projektiTableName,
      oid,
      projektiVersio,
      uusiAineistot,
      pathToAineistot: "hyvaksymisPaatosVaihe.aineistoNahtavilla",
    });
  }

  public async saveHyvaksymisPaatosVaiheHyvaksymispaatos({
    oid,
    projektiVersio,
    uusiAineistot,
  }: {
    oid: string;
    projektiVersio: number;
    uusiAineistot: Array<Aineisto>;
  }): Promise<void> {
    return saveAineistotOrTiedostot({
      projektiTableName: this.projektiTableName,
      oid,
      projektiVersio,
      uusiAineistot,
      pathToAineistot: "hyvaksymisPaatosVaihe.hyvaksymispaatos",
    });
  }

  public async saveJatkoPaatos1VaiheAineistotNahtavilla({
    oid,
    projektiVersio,
    uusiAineistot,
  }: {
    oid: string;
    projektiVersio: number;
    uusiAineistot: Array<Aineisto>;
  }): Promise<void> {
    return saveAineistotOrTiedostot({
      projektiTableName: this.projektiTableName,
      oid,
      projektiVersio,
      uusiAineistot,
      pathToAineistot: "jatkoPaatos1Vaihe.aineistoNahtavilla",
    });
  }

  public async saveJatkoPaatos1VaiheAineistotHyvaksymispaatos({
    oid,
    projektiVersio,
    uusiAineistot,
  }: {
    oid: string;
    projektiVersio: number;
    uusiAineistot: Array<Aineisto>;
  }): Promise<void> {
    return saveAineistotOrTiedostot({
      projektiTableName: this.projektiTableName,
      oid,
      projektiVersio,
      uusiAineistot,
      pathToAineistot: "jatkoPaatos1Vaihe.hyvaksymispaatos",
    });
  }

  public async saveJatkoPaatos2VaiheAineistotNahtavilla({
    oid,
    projektiVersio,
    uusiAineistot,
  }: {
    oid: string;
    projektiVersio: number;
    uusiAineistot: Array<Aineisto>;
  }): Promise<void> {
    return saveAineistotOrTiedostot({
      projektiTableName: this.projektiTableName,
      oid,
      projektiVersio,
      uusiAineistot,
      pathToAineistot: "jatkoPaatos2Vaihe.aineistoNahtavilla",
    });
  }

  public async saveJatkoPaatos2VaiheAineistotHyvaksymispaatos({
    oid,
    projektiVersio,
    uusiAineistot,
  }: {
    oid: string;
    projektiVersio: number;
    uusiAineistot: Array<Aineisto>;
  }): Promise<void> {
    return saveAineistotOrTiedostot({
      projektiTableName: this.projektiTableName,
      oid,
      projektiVersio,
      uusiAineistot,
      pathToAineistot: "jatkoPaatos2Vaihe.hyvaksymispaatos",
    });
  }

  public async saveVuorovaikutusKierrosJulkaisuAineistot({
    oid,
    projektiVersio,
    uusiAineistot,
    vuorovaikutusKierrosIndex,
  }: {
    oid: string;
    projektiVersio: number;
    uusiAineistot: Array<Aineisto>;
    vuorovaikutusKierrosIndex: number;
  }): Promise<void> {
    return saveAineistotOrTiedostot({
      projektiTableName: this.projektiTableName,
      oid,
      projektiVersio,
      uusiAineistot,
      pathToAineistot: `vuorovaikutusKierrosJulkaisut[${vuorovaikutusKierrosIndex}].aineistot`,
    });
  }
}

export const projektiDatabase = new ProjektiDatabase(config.projektiTableName ?? "missing", config.feedbackTableName ?? "missing");
