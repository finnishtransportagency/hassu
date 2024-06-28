import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../config";
import { DBProjekti, HyvaksymisPaatosVaihe, JulkaistuHyvaksymisEsitys, MuokattavaHyvaksymisEsitys } from "../database/model";
import { ProjektiDatabase } from "../database/projektiDatabase";
import { getDynamoDBDocumentClient } from "../aws/client";
import { log } from "../logger";
import { FULL_DATE_TIME_FORMAT_WITH_TZ, nyt } from "../util/dateUtil";
import * as API from "hassu-common/graphql/apiModel";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { NotFoundError, SimultaneousUpdateError } from "hassu-common/error";

export type HyvaksymisEsityksenTiedot = Pick<
  DBProjekti,
  | "oid"
  | "versio"
  | "salt"
  | "kayttoOikeudet"
  | "muokattavaHyvaksymisEsitys"
  | "julkaistuHyvaksymisEsitys"
  | "hyvaksymisPaatosVaihe"
  | "aineistoHandledAt"
  | "velho"
  | "asianhallinta"
  | "hyvEsAineistoPaketti"
>;

export type ProjektiTiedostoineen = Pick<
  DBProjekti,
  | "oid"
  | "versio"
  | "salt"
  | "kielitiedot"
  | "kayttoOikeudet"
  | "velho"
  | "aloitusKuulutusJulkaisut"
  | "vuorovaikutusKierrosJulkaisut"
  | "nahtavillaoloVaiheJulkaisut"
  | "muokattavaHyvaksymisEsitys"
  | "julkaistuHyvaksymisEsitys"
  | "aineistoHandledAt"
  | "hyvEsAineistoPaketti"
>;

class HyvaksymisEsityksenDynamoKutsut extends ProjektiDatabase {
  private static async sendUpdateCommandToDynamoDB(params: UpdateCommand): Promise<void> {
    if (log.isLevelEnabled("debug")) {
      log.debug("Updating projekti to Hassu with params", { params });
    }
    try {
      const dynamoDBDocumentClient = getDynamoDBDocumentClient();
      await dynamoDBDocumentClient.send(params);
    } catch (e) {
      if (e instanceof ConditionalCheckFailedException) {
        throw new SimultaneousUpdateError("Projektia on päivitetty tietokannassa. Lataa projekti uudelleen.");
      }
      log.error(e instanceof Error ? e.message : String(e), { params });
      throw e;
    }
  }

  // TODO: hae hyväksymisPaatosVaiheesta vain id, koska meitä kiinnostaa vain, onko se olemassa vai ei

  async haeProjektinTiedotHyvaksymisEsityksesta(oid: string): Promise<HyvaksymisEsityksenTiedot> {
    const params = new GetCommand({
      TableName: this.projektiTableName,
      Key: { oid },
      ConsistentRead: true,
      ProjectionExpression:
        "oid, versio, salt, kayttoOikeudet, muokattavaHyvaksymisEsitys, julkaistuHyvaksymisEsitys, hyvaksymisPaatosVaihe, aineistoHandledAt, velho, asianhallinta, hyvEsAineistoPaketti",
    });

    try {
      const dynamoDBDocumentClient = getDynamoDBDocumentClient();
      const data = await dynamoDBDocumentClient.send(params);
      if (!data.Item) {
        log.error("Yritettiin hakea projektin tietoja, mutta ei onnistuttu", { params });
        throw new Error();
      }
      const projekti = data.Item as HyvaksymisEsityksenTiedot;
      return projekti;
    } catch (e) {
      log.error(e instanceof Error ? e.message : String(e), { params });
      throw e;
    }
  }

  async haeHyvaksymisEsityksenTiedostoTiedot(oid: string): Promise<ProjektiTiedostoineen> {
    const params = new GetCommand({
      TableName: this.projektiTableName,
      Key: { oid },
      ConsistentRead: true,
      ProjectionExpression:
        "oid, " +
        "versio, " +
        "salt, " +
        "kielitiedot, " +
        "kayttoOikeudet, " +
        "velho, " +
        "aloitusKuulutusJulkaisut, " +
        "vuorovaikutusKierrosJulkaisut, " +
        "nahtavillaoloVaiheJulkaisut, " +
        "muokattavaHyvaksymisEsitys, " +
        "julkaistuHyvaksymisEsitys, " +
        "aineistoHandledAt, " +
        "hyvEsAineistoPaketti",
    });

    try {
      const dynamoDBDocumentClient = getDynamoDBDocumentClient();
      const data = await dynamoDBDocumentClient.send(params);
      if (!data.Item) {
        log.error(`Projektia oid:lla ${oid} ei löydy`);
        throw new NotFoundError(`Projektia oid:lla ${oid} ei löydy`);
      }
      const projekti = data.Item as ProjektiTiedostoineen;
      return projekti;
    } catch (e) {
      log.error(e instanceof Error ? e.message : String(e), { params });
      throw e;
    }
  }

  async tallennaJulkaistuHyvaksymisEsitysJaAsetaTilaHyvaksytyksi(input: {
    oid: string;
    versio: number;
    julkaistuHyvaksymisEsitys: JulkaistuHyvaksymisEsitys;
  }): Promise<number> {
    const { oid, versio, julkaistuHyvaksymisEsitys } = input;
    const nextVersion = versio + 1;
    const params = new UpdateCommand({
      TableName: this.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression:
        "SET " +
        "#versio = :versio, " +
        "#julkaistuHyvaksymisEsitys = :julkaistuHyvaksymisEsitys, " +
        "#muokattavaHyvaksymisEsitys.#tila = :hyvaksytty, " +
        "#muokattavaHyvaksymisEsitys.#palautusSyy = :palautusSyy, " +
        "#paivitetty = :paivitetty",
      ExpressionAttributeNames: {
        "#versio": "versio",
        "#julkaistuHyvaksymisEsitys": "julkaistuHyvaksymisEsitys",
        "#muokattavaHyvaksymisEsitys": "muokattavaHyvaksymisEsitys",
        "#tila": "tila",
        "#paivitetty": "paivitetty",
        "#palautusSyy": "palautusSyy",
      },
      ExpressionAttributeValues: {
        ":versio": nextVersion,
        ":julkaistuHyvaksymisEsitys": julkaistuHyvaksymisEsitys,
        ":paivitetty": nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ),
        ":versioFromInput": versio,
        ":hyvaksytty": API.HyvaksymisTila.HYVAKSYTTY,
        ":odottaaHyvaksyntaa": API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
        ":palautusSyy": null,
      },
      ConditionExpression:
        "(attribute_not_exists(#versio) OR #versio = :versioFromInput) AND " +
        "(attribute_exists(#muokattavaHyvaksymisEsitys) OR #muokattavaHyvaksymisEsitys.#tila = :odottaaHyvaksyntaa)",
    });

    await HyvaksymisEsityksenDynamoKutsut.sendUpdateCommandToDynamoDB(params);
    return nextVersion;
  }

  async setLock(oid: string): Promise<void> {
    const params = new UpdateCommand({
      TableName: this.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression: "SET " + "#lockedUntil = :lockedUntil",
      ExpressionAttributeNames: {
        "#lockedUntil": "lockedUntil",
      },
      ExpressionAttributeValues: {
        ":lockedUntil": nyt().add(29, "seconds").unix(),
      },
    });

    await HyvaksymisEsityksenDynamoKutsut.sendUpdateCommandToDynamoDB(params);
  }

  async releaseLock(oid: string): Promise<void> {
    const params = new UpdateCommand({
      TableName: this.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression: "SET " + "#lockedUntil = :lockedUntil",
      ExpressionAttributeNames: {
        "#lockedUntil": "lockedUntil",
      },
      ExpressionAttributeValues: {
        ":lockedUntil": null,
      },
    });

    await HyvaksymisEsityksenDynamoKutsut.sendUpdateCommandToDynamoDB(params);
  }

  async muutaMuokattavanHyvaksymisEsityksenTilaa(input: {
    oid: string;
    versio: number;
    uusiTila: API.HyvaksymisTila;
    vanhaTila: API.HyvaksymisTila;
  }): Promise<number> {
    const { oid, versio, uusiTila, vanhaTila } = input;
    const nextVersion = versio + 1;
    const params = new UpdateCommand({
      TableName: config.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression: "SET " + "#versio = :versio, " + "#muokattavaHyvaksymisEsitys.#tila = :uusiTila, " + "#paivitetty = :paivitetty",
      ExpressionAttributeNames: {
        "#versio": "versio",
        "#muokattavaHyvaksymisEsitys": "muokattavaHyvaksymisEsitys",
        "#tila": "tila",
        "#paivitetty": "paivitetty",
      },
      ExpressionAttributeValues: {
        ":versio": nextVersion,
        ":uusiTila": uusiTila,
        ":paivitetty": nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ),
        ":vanhaTila": vanhaTila,
        ":versioFromInput": versio,
      },
      ConditionExpression:
        "(attribute_not_exists(#versio) OR #versio = :versioFromInput) AND " + "#muokattavaHyvaksymisEsitys.#tila = :vanhaTila",
    });

    await HyvaksymisEsityksenDynamoKutsut.sendUpdateCommandToDynamoDB(params);
    return nextVersion;
  }

  async palautaHyvaksymisEsityksenTilaMuokkaukseksiJaAsetaSyy(input: { oid: string; versio: number; syy: string }): Promise<number> {
    const { oid, versio, syy } = input;
    const nextVersion = versio + 1;
    const params = new UpdateCommand({
      TableName: config.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression:
        "SET " +
        "#versio = :versio, " +
        "#muokattavaHyvaksymisEsitys.#tila = :muokkaus, " +
        "#muokattavaHyvaksymisEsitys.#palautusSyy = :syy, " +
        "#paivitetty = :paivitetty",
      ExpressionAttributeNames: {
        "#versio": "versio",
        "#muokattavaHyvaksymisEsitys": "muokattavaHyvaksymisEsitys",
        "#tila": "tila",
        "#paivitetty": "paivitetty",
        "#hyvaksymisPaatosVaihe": "hyvaksymisPaatosVaihe",
        "#palautusSyy": "palautusSyy",
      },
      ExpressionAttributeValues: {
        ":versio": nextVersion,
        ":muokkaus": API.HyvaksymisTila.MUOKKAUS,
        ":paivitetty": nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ),
        ":odottaaHyvaksyntaa": API.HyvaksymisTila.ODOTTAA_HYVAKSYNTAA,
        ":syy": syy,
        ":versioFromInput": versio,
      },
      ConditionExpression:
        "(attribute_not_exists(#versio) OR #versio = :versioFromInput) AND " +
        "attribute_not_exists(#hyvaksymisPaatosVaihe) AND " +
        "#muokattavaHyvaksymisEsitys.#tila = :odottaaHyvaksyntaa",
    });

    await HyvaksymisEsityksenDynamoKutsut.sendUpdateCommandToDynamoDB(params);
    return nextVersion;
  }

  async tallennaMuokattavaHyvaksymisEsitys(input: {
    oid: string;
    versio: number;
    muokattavaHyvaksymisEsitys: MuokattavaHyvaksymisEsitys;
    muokkaaja: string;
  }): Promise<number> {
    const { oid, versio, muokattavaHyvaksymisEsitys, muokkaaja } = input;
    const nextVersion = versio + 1;
    const params = new UpdateCommand({
      TableName: config.projektiTableName,
      Key: {
        oid,
      },
      UpdateExpression:
        "SET " + "#versio = :versio, " + "#muokattavaHyvaksymisEsitys = :muokattavaHyvaksymisEsitys, " + "#paivitetty = :paivitetty",
      ExpressionAttributeNames: {
        "#versio": "versio",
        "#muokattavaHyvaksymisEsitys": "muokattavaHyvaksymisEsitys",
        "#paivitetty": "paivitetty",
        "#tila": "tila",
      },
      ExpressionAttributeValues: {
        ":versio": nextVersion,
        ":muokattavaHyvaksymisEsitys": { ...muokattavaHyvaksymisEsitys, muokkaaja },
        ":paivitetty": nyt().format(FULL_DATE_TIME_FORMAT_WITH_TZ),
        ":versioFromInput": versio,
        ":muokkaus": API.HyvaksymisTila.MUOKKAUS,
      },
      ConditionExpression:
        "(attribute_not_exists(#versio) OR #versio = :versioFromInput) AND " +
        "(attribute_not_exists(#muokattavaHyvaksymisEsitys) OR #muokattavaHyvaksymisEsitys.#tila = :muokkaus)",
    });

    await HyvaksymisEsityksenDynamoKutsut.sendUpdateCommandToDynamoDB(params);
    return nextVersion;
  }
}

const projektiDatabase = new HyvaksymisEsityksenDynamoKutsut(config.projektiTableName ?? "missing", config.feedbackTableName ?? "missing");
export default projektiDatabase;
