import { log } from "../logger";
import { config } from "../config";
import { getDynamoDBDocumentClient } from "../aws/client";

import randomize from "randomatic";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

export class LyhytOsoiteDatabase {
  lyhytOsoiteTableName: string = config.lyhytOsoiteTableName ?? "missing";

  async generateAndSetLyhytOsoite(oid: string): Promise<string | undefined> {
    const existingOsoite = await this.getLyhytOsoite(oid);
    if (existingOsoite) {
      return existingOsoite;
    }
    let retriesLeft = 10;
    do {
      const lyhytOsoite = this.randomizeLyhytOsoite(oid);
      if (await this.setLyhytOsoite(lyhytOsoite, oid)) {
        return lyhytOsoite;
      }
      if (retriesLeft-- <= 0) {
        log.error("Lyhytosoitteen luonti epäonnistui");
        return undefined;
      }
    } while (retriesLeft-- > 0);
  }

  async setLyhytOsoite(lyhytOsoite: string, oid: string): Promise<boolean> {
    const params = new PutCommand({
      TableName: this.lyhytOsoiteTableName,
      Item: { lyhytOsoite, oid },
      ConditionExpression: "lyhytOsoite <> :lyhytOsoite AND #oid <> :oid",
      ExpressionAttributeNames: {
        "#oid": "oid",
      },
      ExpressionAttributeValues: {
        ":lyhytOsoite": lyhytOsoite,
        ":oid": oid,
      },
    });
    try {
      await getDynamoDBDocumentClient().send(params);
      return true;
    } catch (e) {
      if (e instanceof ConditionalCheckFailedException) {
        return false;
      }
      throw e;
    }
  }

  async getLyhytOsoite(oid: string): Promise<string | undefined> {
    const params = new ScanCommand({
      TableName: this.lyhytOsoiteTableName,
      FilterExpression: "oid = :oid",
      ExpressionAttributeValues: {
        ":oid": oid,
      },
    });
    const scanResult = await getDynamoDBDocumentClient().send(params);
    const firstItem = scanResult.Items?.[0];
    if (firstItem) {
      return firstItem.lyhytOsoite;
    }
  }

  async getOidForLyhytOsoite(lyhytOsoite: string): Promise<string | undefined> {
    const params = new GetCommand({
      TableName: this.lyhytOsoiteTableName,
      Key: { lyhytOsoite },
    });
    const result = await getDynamoDBDocumentClient().send(params);
    return result.Item?.oid;
  }

  /**
   * Vain testauskäyttöön!
   */
  async deleteLyhytOsoite(lyhytOsoite: string): Promise<void> {
    const params = new DeleteCommand({
      TableName: this.lyhytOsoiteTableName,
      Key: { lyhytOsoite },
    });
    await getDynamoDBDocumentClient().send(params);
  }

  randomizeLyhytOsoite(_oid: string): string {
    return randomize("a0", 4, { exclude: "0oOiIlL1" });
  }
}

export const lyhytOsoiteDatabase = new LyhytOsoiteDatabase();
