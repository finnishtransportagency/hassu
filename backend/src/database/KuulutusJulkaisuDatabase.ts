import {
  BatchWriteCommand,
  BatchWriteCommandOutput,
  DeleteCommand,
  PutCommand,
  PutCommandOutput,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { NahtavillaoloVaiheJulkaisu } from "./model";
import { config } from "../config";
import { getDynamoDBDocumentClient } from "../aws/client";
import { log } from "../logger";

type GenericKuulutusJulkaisu = Pick<NahtavillaoloVaiheJulkaisu, "projektiOid" | "id">;

export class KuulutusJulkaisuDatabase<T extends GenericKuulutusJulkaisu> {
  constructor(julkaisuTableName: string) {
    this.julkaisuTableName = julkaisuTableName;
  }
  julkaisuTableName: string;

  async put(julkaisu: T, description: string | undefined = undefined): Promise<PutCommandOutput> {
    log.info(`Putting julkaisu to ${this.julkaisuTableName} table.`, {
      id: julkaisu.id,
      projektiOid: julkaisu.projektiOid,
      description,
    });
    const command = new PutCommand({
      TableName: this.julkaisuTableName,
      Item: julkaisu,
    });
    return await getDynamoDBDocumentClient().send(command);
  }

  async putAll(
    julkaisut: T[] | null | undefined,
    description: string | undefined = undefined
  ): Promise<BatchWriteCommandOutput | undefined> {
    if (!julkaisut?.length) {
      return;
    }
    log.info(`Putting multiple julkaisu's to ${this.julkaisuTableName} table.`, {
      julkaisut: julkaisut.map(({ projektiOid, id }) => ({ projektiOid, id })),
      description,
    });
    const command = new BatchWriteCommand({
      RequestItems: {
        [this.julkaisuTableName]: julkaisut.map((julkaisu) => ({ PutRequest: { Item: julkaisu } })),
      },
    });
    return await getDynamoDBDocumentClient().send(command);
  }

  async delete({ projektiOid, id }: T, description: string | undefined = undefined): Promise<void> {
    log.info(`Deleting julkaisu from ${this.julkaisuTableName} table.`, {
      id,
      projektiOid,
      description,
    });
    const command = new DeleteCommand({
      TableName: this.julkaisuTableName,
      Key: { id, projektiOid },
    });
    await getDynamoDBDocumentClient().send(command);
  }

  async deleteAll(
    julkaisut: T[] | null | undefined,
    description: string | undefined = undefined
  ): Promise<BatchWriteCommandOutput | undefined> {
    if (!julkaisut?.length) {
      return;
    }
    log.info(`Deleting multiple julkaisu's from ${this.julkaisuTableName} table.`, {
      julkaisut: julkaisut.map(({ projektiOid, id }) => ({ projektiOid, id })),
      description,
    });
    const command = new BatchWriteCommand({
      RequestItems: {
        [this.julkaisuTableName]: julkaisut.map(({ id, projektiOid }) => ({ DeleteRequest: { Key: { id, projektiOid } } })),
      },
    });
    await getDynamoDBDocumentClient().send(command);
  }

  async getAllForProjekti(projektiOid: string, stronglyConsistentRead: boolean): Promise<T[] | undefined> {
    const command = new QueryCommand({
      TableName: this.julkaisuTableName,
      KeyConditionExpression: "#projektiOid = :projektiOid",
      ExpressionAttributeNames: {
        "#projektiOid": "projektiOid",
      },
      ExpressionAttributeValues: {
        ":projektiOid": projektiOid,
      },
      ConsistentRead: stronglyConsistentRead,
    });
    const output = await getDynamoDBDocumentClient().send(command);
    return output?.Items as T[] | undefined;
  }
}

export const nahtavillaoloVaiheJulkaisuDatabase = new KuulutusJulkaisuDatabase<NahtavillaoloVaiheJulkaisu>(
  config.nahtavillaoloVaiheJulkaisuTableName ?? "missing"
);
