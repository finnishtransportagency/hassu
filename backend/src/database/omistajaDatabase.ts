import { log } from "../logger";
import { config } from "../config";
import { getDynamoDBDocumentClient } from "../aws/client";
import {
  PutCommand,
  PutCommandOutput,
  ScanCommand,
  ScanCommandOutput,
  QueryCommand,
  UpdateCommand,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { chunkArray } from "./chunkArray";
import { TiedotettavanLahetyksenTila } from "hassu-common/graphql/apiModel";

export type OmistajaKey = {
  oid: string;
  id: string;
};

export type DBOmistaja = {
  id: string;
  oid: string;
  kiinteistotunnus?: string | null;
  kayttooikeusyksikkotunnus?: string | null;
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
  lahetykset?: { tila: TiedotettavanLahetyksenTila; lahetysaika: string }[];
  userCreated?: boolean;
};

export type OmistajaScanResult = {
  startKey: OmistajaKey | undefined;
  omistajat: DBOmistaja[];
};

type TransactionItem = Exclude<TransactWriteCommandInput["TransactItems"], undefined>[0];

class OmistajaDatabase {
  private readonly tableName: string;
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

  async haeProjektinKaytossaolevatOmistajat(oid: string, expression?: string): Promise<DBOmistaja[]> {
    let lastEvaluatedKey: Record<string, any> | undefined;
    const omistajat: DBOmistaja[] = [];
    let data;
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
        ProjectionExpression: expression,
      });
      data = await getDynamoDBDocumentClient().send(command);
      lastEvaluatedKey = data?.LastEvaluatedKey;
      omistajat.push(...((data?.Items as DBOmistaja[]) ?? []));
    } while (lastEvaluatedKey !== undefined);
    return omistajat;
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
        const transactItems = items.map<TransactionItem>((item) => ({
          Update: {
            ExpressionAttributeNames: {
              "#kaytossa": "kaytossa",
            },
            ExpressionAttributeValues: {
              ":kaytossa": false,
            },
            UpdateExpression: "set #kaytossa = :kaytossa",
            TableName: this.tableName,
            Key: {
              id: item.id,
              oid: item.oid,
            },
          },
        }));

        const oldOmistajatChunks = chunkArray(transactItems, 25);

        for (const chunk of oldOmistajatChunks) {
          const transactCommand = new TransactWriteCommand({
            TransactItems: chunk,
          });
          await getDynamoDBDocumentClient().send(transactCommand);
        }
      }
      log.info("Lisätään " + lisattavatOmistajat.length + " omistaja(a)");
      const newTransactItems = lisattavatOmistajat.map<TransactionItem>((item) => ({
        Put: {
          TableName: this.tableName,
          Item: item,
        },
      }));
      const newOmistajatChunks = chunkArray(newTransactItems, 25);
      for (const chunk of newOmistajatChunks) {
        const transactCommand = new TransactWriteCommand({
          TransactItems: chunk,
        });
        await getDynamoDBDocumentClient().send(transactCommand);
      }
    } catch (error) {
      log.error("Projektin kiinteistönomistajien korvaaminen epäonnistui");
      throw error;
    }
  }

  async deleteOmistajatByOid(oid: string) {
    if (config.env !== "prod") {
      let lastEvaluatedKey: Record<string, any> | undefined;
      const omistajat: Record<string, any>[] = [];
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
        omistajat.push(...(data.Items ?? []));
      } while (lastEvaluatedKey !== undefined);
      const newTransactItems = omistajat.map<TransactionItem>(({ id }) => ({
        Delete: {
          TableName: this.tableName,
          Key: { oid, id },
        },
      }));
      for (const chunk of chunkArray(newTransactItems, 25)) {
        const transactCommand = new TransactWriteCommand({
          TransactItems: chunk,
        });
        await getDynamoDBDocumentClient().send(transactCommand);
      }
    }
  }
}

export const omistajaDatabase = new OmistajaDatabase(config.kiinteistonomistajaTableName ?? "missing");
