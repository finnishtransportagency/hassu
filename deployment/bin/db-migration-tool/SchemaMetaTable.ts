import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "./ddb";

export class SchemaMetaTable {
  private readonly tableName: string;

  constructor(environment: string) {
    this.tableName = `SchemaMeta-${environment}`;
  }

  async getSchemaVersion(tableName: string): Promise<number> {
    const res = await ddb.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { tableName },
      })
    );
    return res.Item?.currentVersion ?? 0;
  }

  async setSchemaVersion(tableName: string, v: number): Promise<void> {
    await ddb.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { tableName },
        UpdateExpression: "SET currentVersion = :v REMOVE lockUntil",
        ExpressionAttributeValues: { ":v": v },
      })
    );
  }

  async acquireTableLock(tableName: string, minutes = 10): Promise<boolean> {
    const now = Math.floor(Date.now() / 1000);
    const lockUntil = now + minutes * 60;

    try {
      await ddb.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { tableName },
          UpdateExpression: "SET lockedUntil = :lock",
          ConditionExpression: "attribute_not_exists(lockedUntil) OR lockedUntil < :now",
          ExpressionAttributeValues: {
            ":lock": lockUntil,
            ":now": now,
          },
        })
      );
      console.log(`🔒 ${tableName} locked until ${lockUntil}`);
      return true;
    } catch (err) {
      console.warn(`⚠️ Failed to acquire lock for ${tableName}`, err);
      return false;
    }
  }

  async releaseTableLock(tableName: string) {
    await ddb.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { tableName },
        UpdateExpression: "REMOVE lockedUntil",
      })
    );
  }
}
