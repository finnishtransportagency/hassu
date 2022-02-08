import { log } from "../logger";
import { DBProjekti } from "./model/projekti";
import { config } from "../config";
import { getDynamoDBDocumentClient } from "./dynamoDB";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import { GetItemOutput } from "@aws-sdk/client-dynamodb";
import { AWSError } from "aws-sdk";
import { Response } from "aws-sdk/lib/response";

const projektiTableName: string = config.projektiTableName as any;
const archiveTableName: string = config.projektiArchiveTableName as any;

export type ArchivedProjektiKey = {
  oid: string;
  timestamp: string;
};

async function createProjekti(projekti: DBProjekti) {
  const params: DocumentClient.PutItemInput = {
    TableName: projektiTableName,
    Item: projekti as DBProjekti,
  };
  return await getDynamoDBDocumentClient().put(params).promise();
}

async function listProjektit(): Promise<DBProjekti[]> {
  const params = {
    TableName: projektiTableName,
  };
  const data = await getDynamoDBDocumentClient().scan(params).promise();
  return data.Items as DBProjekti[];
}

async function loadProjektiByOid(oid: string): Promise<DBProjekti | undefined> {
  const params: DocumentClient.GetItemInput = {
    TableName: projektiTableName,
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

function createExpression(expression: string, properties: string[]) {
  return properties.length > 0 ? expression + " " + properties.join(" , ") : "";
}

async function saveProjekti(dbProjekti: DBProjekti) {
  log.info("Updating projekti to Hassu ", { dbProjekti });
  const setExpression: string[] = [];
  const removeExpression: string[] = [];
  const ExpressionAttributeNames = {} as any;
  const ExpressionAttributeValues = {} as any;
  for (const property in dbProjekti) {
    if (readOnlyFields.indexOf(property) >= 0) {
      continue;
    }
    const value = (dbProjekti as any)[property];
    if (value === undefined) {
      continue;
    }
    if (value === null) {
      removeExpression.push(property);
    } else {
      setExpression.push(`#${property} = :${property}`);
      ExpressionAttributeNames["#" + property] = property;
      ExpressionAttributeValues[":" + property] = value;
    }
  }

  const updateExpression = createExpression("SET", setExpression) + " " + createExpression("REMOVE", removeExpression);

  const params = {
    TableName: projektiTableName,
    Key: {
      oid: dbProjekti.oid,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  };

  log.info("Updating projekti to Hassu", { params });
  return await getDynamoDBDocumentClient().update(params).promise();
}

async function archiveProjektiByOid({ oid, timestamp }: ArchivedProjektiKey): Promise<void> {
  const client = getDynamoDBDocumentClient();

  // Load projekti to be archived
  const data: GetItemOutput = await client
    .get({
      TableName: projektiTableName,
      Key: { oid },
      ConsistentRead: true,
    })
    .promise();
  const item: ArchivedProjektiKey | any = data.Item;
  if (!item) {
    throw new Error("Arkistointi ei onnistunut, koska arkistoitavaa projektia ei löytynyt tietokannasta.");
  }

  // Assign sort key
  item.timestamp = timestamp;

  // Write the copied projekti to archive table
  const putParams: DocumentClient.PutItemInput = {
    TableName: archiveTableName,
    Item: item,
  };
  const putResult = await client.put(putParams).promise();
  checkAndRaiseError(putResult.$response);

  // Delete the archived projekti
  const removeResult = await client
    .delete({
      TableName: projektiTableName,
      Key: {
        oid,
      },
    })
    .promise();
  checkAndRaiseError(removeResult.$response);
}

function checkAndRaiseError<T>(response: Response<T, AWSError>) {
  if (response.error) {
    log.error("Arkistointi ei onnistunut", { error: response.error });
    throw new Error("Arkistointi ei onnistunut");
  }
}

export const projektiDatabase = {
  createProjekti,
  saveProjekti,
  listProjektit,
  loadProjektiByOid,
  archiveProjektiByOid,
};
