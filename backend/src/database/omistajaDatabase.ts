import { log } from "../logger";
import { config } from "../config";
import { getDynamoDBDocumentClient } from "../aws/client";
import { PutCommand, PutCommandOutput, ScanCommand, ScanCommandOutput } from "@aws-sdk/lib-dynamodb";

export type OmistajaKey = {
  oid: string;
  id: string;
};

export type DBOmistaja = {
  id: string;
  oid: string;
  kiinteistotunnus: string;
  lisatty: string;
  paivitetty?: string | null;
  etunimet?: string | null;
  sukunimi?: string | null;
  nimi?: string | null;
  henkilotunnus?: string;
  ytunnus?: string;
  jakeluosoite?: string | null;
  postinumero?: string | null;
  paikkakunta?: string | null;
  maakoodi?: string | null;
  expires?: number;
  suomifiLahetys: boolean;
  lahetykset?: [{ tila: "OK" | "VIRHE"; lahetysaika: string }];
};

export type OmistajaScanResult = {
  startKey: OmistajaKey | undefined;
  omistajat: DBOmistaja[];
};

class OmistajaDatabase {
  private tableName: string;
  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async createOmistaja(omistaja: DBOmistaja): Promise<PutCommandOutput> {
    const params = new PutCommand({
      TableName: this.tableName,
      Item: omistaja,
    });
    return getDynamoDBDocumentClient().send(params);
  }

  async scanOmistajat(startKey?: OmistajaKey): Promise<OmistajaScanResult> {
    try {
      const params = new ScanCommand({
        TableName: this.tableName,
        Limit: 10,
        ExclusiveStartKey: startKey,
      });
      const data: ScanCommandOutput = await getDynamoDBDocumentClient().send(params);
      return {
        omistajat: data.Items as DBOmistaja[],
        startKey: (data.LastEvaluatedKey as OmistajaKey) ?? undefined,
      };
    } catch (e) {
      log.error(e);
      throw e;
    }
  }
}

export const omistajaDatabase = new OmistajaDatabase(config.kiinteistonomistajaTableName ?? "missing");
