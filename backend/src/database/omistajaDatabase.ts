import { log } from "../logger";
import { config } from "../config";
import { getDynamoDBDocumentClient } from "../aws/client";
import {
  PutCommand,
  PutCommandOutput,
  ScanCommand,
  ScanCommandOutput,
  QueryCommand,
  BatchWriteCommand,
  UpdateCommand,
  TransactWriteCommandInput,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

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
  kaytossa: boolean;
  suomifiLahetys?: boolean;
  lahetykset?: [{ tila: "OK" | "VIRHE"; lahetysaika: string }];
};

export type OmistajaScanResult = {
  startKey: OmistajaKey | undefined;
  omistajat: DBOmistaja[];
};

function* chunkArray<T>(arr: T[], stride = 1) {
  for (let i = 0; i < arr.length; i += stride) {
    yield arr.slice(i, Math.min(i + stride, arr.length));
  }
}

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
        Limit: 50,
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

  async haeProjektinKaytossaolevatOmistajat(oid: string): Promise<DBOmistaja[]> {
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
    });
    const data = await getDynamoDBDocumentClient().send(command);
    return (data?.Items ?? []) as DBOmistaja[];
  }

  async poistaOmistajaKaytosta(oid: string, id: string): Promise<void> {
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

  async vaihdaProjektinKaytossaolevatOmistajat(oid: string, lisattavatOmistajat: DBOmistaja[]): Promise<void> {
    try {
      const items = await this.haeProjektinKaytossaolevatOmistajat(oid);
      if (items.length) {
        log.info("Otetaan käytöstä " + items.length + " omistaja(a)");
        const transactItems: TransactWriteCommandInput["TransactItems"] = items.map((item) => ({
          Update: {
            ExpressionAttributeNames: {
              "#kaytossa": "kaytossa",
            },
            ExpressionAttributeValues: {
              ":kaytossa": {
                BOOL: false,
              },
            },
            UpdateExpression: "set #kaytossa = :kaytossa",
            TableName: this.tableName,
            Key: {
              id: {
                S: item.id,
              },
              oid: {
                S: item.oid,
              },
            },
            ReturnValuesOnConditionCheckFailure: "ALL_OLD",
          },
        }));

        const oldOmistajatChunks = chunkArray(transactItems, 25);

        for (const chunk of oldOmistajatChunks) {
          const params = new TransactWriteCommand({
            TransactItems: chunk,
          });
          log.info("Päivitetään " + chunk.length + " omistaja(a)");
          await getDynamoDBDocumentClient().send(params);
        }
      }

      const omistajatChunks = chunkArray(lisattavatOmistajat, 25);

      for (const chunk of omistajatChunks) {
        const putRequests = chunk.map((omistaja) => ({
          PutRequest: {
            Item: { ...omistaja },
          },
        }));
        log.info("Tallennetaan " + putRequests.length + " omistaja(a)");
        await getDynamoDBDocumentClient().send(
          new BatchWriteCommand({
            RequestItems: {
              [this.tableName]: putRequests,
            },
          })
        );
      }
    } catch (error) {
      log.error("Projektin kiinteistönomistajien korvaaminen epäonnistui");
      throw error;
    }
  }
}

export const omistajaDatabase = new OmistajaDatabase(config.kiinteistonomistajaTableName ?? "missing");
