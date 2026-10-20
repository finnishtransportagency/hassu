import { getDynamoDBDocumentClient } from "../aws/client";
import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getMielipideTableName } from "../util/environment";

export type DBMielipide = {
  oid: string;
  id: string;
  expires: number;
  lisatty: string;
  mielipide: string;
  liitteet?: string[] | null;
  etunimi?: string | null;
  sukunimi?: string | null;
  lahiosoite?: string | null;
  postinumero?: string | null;
  postitoimipaikka?: string | null;
  sahkoposti?: string | null;
  puhelinnumero?: string | null;
};

class MielipideDatabase {
  private readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async tallennaMielipide(mielipide: DBMielipide): Promise<void> {
    await getDynamoDBDocumentClient().send(new PutCommand({ TableName: this.tableName, Item: mielipide }));
  }

  async haeMielipide(oid: string, id: string): Promise<DBMielipide | undefined> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { oid, id },
    });
    const result = await getDynamoDBDocumentClient().send(command);
    return result.Item as DBMielipide | undefined;
  }

  async haeMielipideMaara(oid: string): Promise<number> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "#oid = :oid",
      ExpressionAttributeNames: { "#oid": "oid" },
      ExpressionAttributeValues: { ":oid": oid },
      Select: "COUNT",
    });
    const data = await getDynamoDBDocumentClient().send(command);
    return data.Count ?? 0;
  }
}

export const mielipideDatabase = new MielipideDatabase(getMielipideTableName());
