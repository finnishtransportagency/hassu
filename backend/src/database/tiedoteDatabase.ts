import { log } from "../logger";
import { config } from "../config";
import { getDynamoDBDocumentClient } from "../aws/client";
import {
  PutCommand,
  PutCommandOutput,
  ScanCommand,
  ScanCommandOutput,
  QueryCommand,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { chunkArray } from "./chunkArray";

export type TiedoteKey = {
  id: string;
};

export type DBTiedote = {
  id: string;
  aktiivinen: boolean;
  kenelleNaytetaan: string;
  otsikko: string;
  tiedoteFI: string;
  tiedoteSV?: string | null;
  tiedoteTyyppi: string;
  voimassaAlkaen: string;
  voimassaPaattyen?: string | null;
};

export type TiedoteScanResult = {
  startKey: TiedoteKey | undefined;
  tiedotteet: DBTiedote[];
};

type TransactionItem = Exclude<TransactWriteCommandInput["TransactItems"], undefined>[0];

class TiedoteDatabase {
  private readonly tableName: string;
  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async tallennaTiedote(tiedote: any): Promise<PutCommandOutput> {
    const params = new PutCommand({
      TableName: this.tableName,
      Item: tiedote,
    });
    return getDynamoDBDocumentClient().send(params);
  }

  async scanTiedotteet(startKey?: TiedoteKey): Promise<TiedoteScanResult> {
    try {
      const params = new ScanCommand({
        TableName: this.tableName,
        Limit: 10,
        ExclusiveStartKey: startKey,
      });
      const data: ScanCommandOutput = await getDynamoDBDocumentClient().send(params);
      return {
        tiedotteet: data.Items as DBTiedote[],
        startKey: (data.LastEvaluatedKey as TiedoteKey) ?? undefined,
      };
    } catch (e) {
      log.error(e);
      throw e;
    }
  }

  async haeKaikkiTiedotteet(expression?: string): Promise<DBTiedote[]> {
    let lastEvaluatedKey: Record<string, any> | undefined;
    const tiedotteet: DBTiedote[] = [];
    let data;

    do {
      const command = new ScanCommand({
        TableName: this.tableName,
        ExclusiveStartKey: lastEvaluatedKey,
        ProjectionExpression: expression,
      });

      data = await getDynamoDBDocumentClient().send(command);
      lastEvaluatedKey = data?.LastEvaluatedKey;
      tiedotteet.push(...((data?.Items as DBTiedote[]) ?? []));
    } while (lastEvaluatedKey !== undefined);

    return tiedotteet;
  }

  async poistaTiedoteById(id: string) {
    if (config.env !== "prod") {
      let lastEvaluatedKey: Record<string, any> | undefined;
      const tiedotteet: Record<string, any>[] = [];
      do {
        const command = new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "#id = :id",
          ExpressionAttributeValues: {
            ":id": id,
          },
          ExpressionAttributeNames: {
            "#id": "id",
          },
          ProjectionExpression: "id",
          ExclusiveStartKey: lastEvaluatedKey,
        });
        const data = await getDynamoDBDocumentClient().send(command);
        lastEvaluatedKey = data.LastEvaluatedKey;
        tiedotteet.push(...(data.Items ?? []));
      } while (lastEvaluatedKey !== undefined);
      const newTransactItems = tiedotteet.map<TransactionItem>(({ id }) => ({
        Delete: {
          TableName: this.tableName,
          Key: { id },
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

export const tiedoteDatabase = new TiedoteDatabase(config.tiedoteTableName ?? "missing");
