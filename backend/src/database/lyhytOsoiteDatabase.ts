import { log } from "../logger";
import { config } from "../config";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import { getDynamoDBDocumentClient } from "../aws/client";
import { AWSError } from "aws-sdk";

import randomize from "randomatic";

export class LyhytOsoiteDatabase {
  lyhytOsoiteTableName: string = config.lyhytOsoiteTableName || "missing";

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
    const params: DocumentClient.PutItemInput = {
      TableName: this.lyhytOsoiteTableName,
      Item: { lyhytOsoite, oid },
      ConditionExpression: "lyhytOsoite <> :lyhytOsoite AND #oid <> :oid",
      ExpressionAttributeNames: {
        "#oid": "oid",
      },
      ExpressionAttributeValues: {
        ":lyhytOsoite": lyhytOsoite,
        ":oid": { S: oid },
      },
    };
    try {
      await getDynamoDBDocumentClient().put(params).promise();
      return true;
    } catch (e) {
      if ((e as AWSError).code == "ConditionalCheckFailedException") {
        return false;
      }
      throw e;
    }
  }

  async getLyhytOsoite(oid: string): Promise<string | undefined> {
    const params: DocumentClient.ScanInput = {
      TableName: this.lyhytOsoiteTableName,
      FilterExpression: "oid = :oid",
      ExpressionAttributeValues: {
        ":oid": oid,
      },
    };
    const scanResult = await getDynamoDBDocumentClient().scan(params).promise();
    const firstItem = scanResult.Items?.[0];
    if (firstItem) {
      return firstItem.lyhytOsoite;
    }
  }

  async getOidForLyhytOsoite(lyhytOsoite: string): Promise<string | undefined> {
    const params: DocumentClient.GetItemInput = {
      TableName: this.lyhytOsoiteTableName,
      Key: { lyhytOsoite },
    };
    const result = await getDynamoDBDocumentClient().get(params).promise();
    return result.Item?.oid;
  }

  /**
   * Vain testauskäyttöön!
   */
  async deleteLyhytOsoite(lyhytOsoite: string): Promise<void> {
    const params: DocumentClient.DeleteItemInput = {
      TableName: this.lyhytOsoiteTableName,
      Key: { lyhytOsoite },
    };
    await getDynamoDBDocumentClient().delete(params).promise();
  }

  randomizeLyhytOsoite(_oid: string): string {
    return randomize("a0", 4, { exclude: "0oOiIlL1" });
  }
}

export const lyhytOsoiteDatabase = new LyhytOsoiteDatabase();
