import {
  BatchWriteCommand,
  BatchWriteCommandOutput,
  DeleteCommand,
  PutCommand,
  PutCommandOutput,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import { config } from "../config";
import { getDynamoDBDocumentClient } from "../aws/client";
import { log } from "../logger";
import { AnyProjektiDataItem } from "./model";

class ProjektiEntityDatabase {
  tableName = config.projektiDataTableName;

  async put(item: AnyProjektiDataItem, description: string | undefined = undefined): Promise<PutCommandOutput> {
    log.info(`Putting projekti data to ${this.tableName} table.`, {
      sortKey: item.sortKey,
      projektiOid: item.projektiOid,
      description,
    });
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });
    return await getDynamoDBDocumentClient().send(command);
  }

  async putAll(
    julkaisut: AnyProjektiDataItem[] | null | undefined,
    description: string | undefined = undefined
  ): Promise<BatchWriteCommandOutput | undefined> {
    if (!julkaisut?.length) {
      return;
    }
    log.info(`Putting multiple items to ${this.tableName} table.`, {
      julkaisut: julkaisut.map(({ projektiOid, sortKey }) => ({ projektiOid, sortKey })),
      description,
    });
    const command = new BatchWriteCommand({
      RequestItems: {
        [this.tableName]: julkaisut.map((julkaisu) => ({ PutRequest: { Item: julkaisu } })),
      },
    });
    return await getDynamoDBDocumentClient().send(command);
  }

  async delete({ projektiOid, sortKey }: AnyProjektiDataItem, description: string | undefined = undefined): Promise<void> {
    log.info(`Deleting item from ${this.tableName} table.`, {
      sortKey,
      projektiOid,
      description,
    });
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { sortKey, projektiOid },
    });
    await getDynamoDBDocumentClient().send(command);
  }

  async deleteAll(
    julkaisut: AnyProjektiDataItem[] | null | undefined,
    description: string | undefined = undefined
  ): Promise<BatchWriteCommandOutput | undefined> {
    if (!julkaisut?.length) {
      return;
    }
    log.info(`Deleting items from ${this.tableName} table.`, {
      julkaisut: julkaisut.map(({ projektiOid, sortKey }) => ({ projektiOid, sortKey })),
      description,
    });
    const command = new BatchWriteCommand({
      RequestItems: {
        [this.tableName]: julkaisut.map(({ sortKey, projektiOid }) => ({ DeleteRequest: { Key: { sortKey, projektiOid } } })),
      },
    });
    await getDynamoDBDocumentClient().send(command);
  }

  async getAllForProjekti(projektiOid: string, stronglyConsistentRead: boolean): Promise<AnyProjektiDataItem[]> {
    let startKey: QueryCommandInput["ExclusiveStartKey"] = undefined;
    const julkaisut: AnyProjektiDataItem[] = [];

    do {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "#projektiOid = :projektiOid",
        ExpressionAttributeNames: {
          "#projektiOid": "projektiOid",
        },
        ExpressionAttributeValues: {
          ":projektiOid": projektiOid,
        },
        ConsistentRead: stronglyConsistentRead,
        ExclusiveStartKey: startKey,
      });
      const output: QueryCommandOutput = await getDynamoDBDocumentClient().send(command);
      const items = (output?.Items ?? []) as AnyProjektiDataItem[];
      julkaisut.push(...items);
      startKey = output?.LastEvaluatedKey;
    } while (startKey);

    return julkaisut;
  }
}

export const projektiEntityDatabase = new ProjektiEntityDatabase();
