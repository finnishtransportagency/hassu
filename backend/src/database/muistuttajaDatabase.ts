import { getDynamoDBDocumentClient } from "../aws/client";
import { BatchWriteCommand, QueryCommand, ScanCommand, ScanCommandOutput } from "@aws-sdk/lib-dynamodb";
import { getMuistuttajaTableName } from "../util/environment";
import { log } from "../logger";
import { config } from "../config";
import { chunkArray } from "./chunkArray";

export type DBMuistuttaja = {
  id: string;
  expires: number;
  lisatty: string;
  etunimi?: string | null;
  sukunimi?: string | null;
  henkilotunnus?: string | null;
  lahiosoite?: string | null;
  postinumero?: string | null;
  postitoimipaikka?: string | null;
  sahkoposti?: string | null;
  puhelinnumero?: string | null;
  nimi?: string | null;
  tiedotusosoite?: string | null;
  tiedotustapa?: string | null;
  paivitetty?: string | null;
  vastaanotettu?: string | null;
  muistutus?: string | null;
  oid: string;
  lahetykset?: [{ tila: "OK" | "VIRHE"; lahetysaika: string }];
  liite?: string | null;
  maakoodi?: string | null;
  suomifiLahetys?: boolean;
};

export type MuistuttajaKey = {
  oid: string;
  id: string;
};

export type MuistuttajaScanResult = {
  startKey: MuistuttajaKey | undefined;
  muistuttajat: DBMuistuttaja[];
};

class MuistuttajaDatabase {
  private tableName: string;
  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async haeProjektinMuistuttajat(oid: string): Promise<DBMuistuttaja[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "#oid = :oid",
      ExpressionAttributeValues: {
        ":oid": oid,
      },
      ExpressionAttributeNames: {
        "#oid": "oid",
      },
    });
    const data = await getDynamoDBDocumentClient().send(command);
    return (data?.Items ?? []) as DBMuistuttaja[];
  }

  async scanMuistuttajat(startKey?: MuistuttajaKey): Promise<MuistuttajaScanResult> {
    try {
      const params = new ScanCommand({
        TableName: this.tableName,
        Limit: 50,
        ExclusiveStartKey: startKey,
      });
      const data: ScanCommandOutput = await getDynamoDBDocumentClient().send(params);
      return {
        muistuttajat: data.Items as DBMuistuttaja[],
        startKey: (data.LastEvaluatedKey as MuistuttajaKey) ?? undefined,
      };
    } catch (e) {
      log.error(e);
      throw e;
    }
  }

  async deleteMuistuttajatByOid(oid: string) {
    if (config.env !== "prod") {
      for (const chunk of chunkArray(await this.haeProjektinMuistuttajat(oid), 25)) {
        const deleteRequests = chunk.map((muistuttaja) => ({
          DeleteRequest: {
            Key: { oid, id: muistuttaja.id },
          },
        }));
        await getDynamoDBDocumentClient().send(
          new BatchWriteCommand({
            RequestItems: {
              [this.tableName]: deleteRequests,
            },
          })
        );
      }
    }
  }
}

export const muistuttajaDatabase = new MuistuttajaDatabase(getMuistuttajaTableName());
