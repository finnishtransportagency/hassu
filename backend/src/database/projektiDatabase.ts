import log from "loglevel";
import { DBProjekti } from "./model/projekti";
import { config } from "../config";
import { getDynamoDBDocumentClient } from "./dynamoDB";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";

const tableName: string = config.projektiTableName as any;

async function createProjekti(projekti: DBProjekti) {
  const params: DocumentClient.PutItemInput = {
    TableName: tableName,
    Item: projekti as DBProjekti,
  };
  return await getDynamoDBDocumentClient().put(params).promise();
}

async function listProjektit(): Promise<DBProjekti[]> {
  const params = {
    TableName: tableName,
  };
  const data = await getDynamoDBDocumentClient().scan(params).promise();
  return data.Items as DBProjekti[];
}

async function loadProjektiByOid(oid: string): Promise<DBProjekti | undefined> {
  const params: DocumentClient.GetItemInput = {
    TableName: tableName,
    Key: { oid },
    ConsistentRead: true,
  };
  const data = await getDynamoDBDocumentClient().get(params).promise();
  if (!data.Item) {
    return;
  }
  const projekti = data.Item as DBProjekti;
  projekti.oid = oid;
  return projekti;
}

const readOnlyFields = ["oid", "tallennettu"];

async function saveProjekti(dbProjekti: DBProjekti) {
  log.info("Updating projekti to Hassu ", dbProjekti);
  let updateExpression = "set";
  const ExpressionAttributeNames = {} as any;
  const ExpressionAttributeValues = {} as any;
  for (const property in dbProjekti) {
    if (dbProjekti.hasOwnProperty(property)) {
      if (readOnlyFields.indexOf(property) >= 0) {
        continue;
      }
      const value = (dbProjekti as any)[property];
      if (!value) {
        continue;
      }
      updateExpression += ` #${property} = :${property} ,`;
      ExpressionAttributeNames["#" + property] = property;
      ExpressionAttributeValues[":" + property] = value;
    }
  }

  updateExpression = updateExpression.slice(0, -1);

  const params = {
    TableName: tableName,
    Key: {
      oid: dbProjekti.oid,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  };

  log.info("Updating projekti to Hassu", params);
  return await getDynamoDBDocumentClient().update(params).promise();
}

export const projektiDatabase = {
  createProjekti,
  saveProjekti,
  listProjektit,
  loadProjektiByOid,
};
