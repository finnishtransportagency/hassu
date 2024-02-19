import { config } from "../config";
import { getDynamoDBDocumentClient } from "../aws/client";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { DBMuistuttaja } from "../muistutus/muistutusHandler";

class MuistuttajaDatabase {
  private tableName: string;
  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async haeProjektinKaytossaolevatMuistuttajat(oid: string): Promise<DBMuistuttaja[]> {
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
    return (data?.Items ?? []) as DBMuistuttaja[];
  }
}

export const muistuttajaDatabase = new MuistuttajaDatabase(config.projektiMuistuttajaTableName ?? "missing");
