import { getDynamoDBDocumentClient } from "../aws/client";
import { BatchWriteCommand, QueryCommand, ScanCommand, ScanCommandOutput, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getMuistuttajaTableName } from "../util/environment";
import { log } from "../logger";
import { config } from "../config";
import { chunkArray } from "./chunkArray";
import { TiedotettavanLahetyksenTila } from "hassu-common/graphql/apiModel";

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
  lahetykset?: { tila: TiedotettavanLahetyksenTila; lahetysaika: string }[];
  liitteet?: string[] | null;
  maakoodi?: string | null;
  suomifiLahetys?: boolean;
  kaytossa?: boolean;
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

  async haeProjektinKaytossaolevatMuistuttajat(oid: string): Promise<DBMuistuttaja[]> {
    let lastEvaluatedKey: Record<string, any> | undefined;
    const muistuttajat: DBMuistuttaja[] = [];
    do {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "#oid = :oid",
        ExpressionAttributeValues: {
          ":oid": oid,
          ":kaytossa": true,
        },
        ExpressionAttributeNames: {
          "#oid": "oid",
          "#kaytossa": "kaytossa",
        },
        FilterExpression: "#kaytossa = :kaytossa",
        ExclusiveStartKey: lastEvaluatedKey,
      });
      const data = await getDynamoDBDocumentClient().send(command);
      lastEvaluatedKey = data.LastEvaluatedKey;
      muistuttajat.push(...((data?.Items as DBMuistuttaja[]) ?? []));
    } while (lastEvaluatedKey !== undefined);
    return muistuttajat;
  }

  async poistaMuistuttajaKaytosta(oid: string, id: string): Promise<void> {
    const params = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        oid,
        id,
      },
      UpdateExpression: "SET #kaytossa = :kaytossa",
      ExpressionAttributeNames: {
        "#kaytossa": "kaytossa",
      },
      ExpressionAttributeValues: {
        ":kaytossa": false,
      },
    });
    await getDynamoDBDocumentClient().send(params);
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
      let lastEvaluatedKey: Record<string, any> | undefined;
      const muistuttajat: Record<string, any>[] = [];
      do {
        const command = new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "#oid = :oid",
          ExpressionAttributeValues: {
            ":oid": oid,
          },
          ExpressionAttributeNames: {
            "#oid": "oid",
          },
          ProjectionExpression: "id",
          ExclusiveStartKey: lastEvaluatedKey,
        });
        const data = await getDynamoDBDocumentClient().send(command);
        lastEvaluatedKey = data.LastEvaluatedKey;
        muistuttajat.push(...(data.Items ?? []));
      } while (lastEvaluatedKey !== undefined);
      for (const chunk of chunkArray(muistuttajat, 25)) {
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
