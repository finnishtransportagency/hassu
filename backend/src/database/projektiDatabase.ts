import { log } from "../logger";
import { AloitusKuulutusJulkaisu, DBProjekti } from "./model/projekti";
import { config } from "../config";
import { getDynamoDBDocumentClient } from "./dynamoDB";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import { AWSError } from "aws-sdk";
import { Response } from "aws-sdk/lib/response";
import dayjs from "dayjs";

const projektiTableName: string = config.projektiTableName;
const archiveTableName: string = config.projektiArchiveTableName;

export type ArchivedProjektiKey = {
  oid: string;
  timestamp: string;
};

async function createProjekti(projekti: DBProjekti): Promise<DocumentClient.PutItemOutput> {
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

async function scanProjektit(startKey?: string): Promise<{ startKey: string; projektis: DBProjekti[] }> {
  try {
    const params: DocumentClient.ScanInput = {
      TableName: projektiTableName,
      Limit: 10,
      ExclusiveStartKey: startKey ? JSON.parse(startKey) : undefined,
    };
    const data: DocumentClient.ScanOutput = await getDynamoDBDocumentClient().scan(params).promise();
    return {
      projektis: data.Items as DBProjekti[],
      startKey: data.LastEvaluatedKey ? JSON.stringify(data.LastEvaluatedKey) : undefined,
    };
  } catch (e) {
    log.error(e);
    throw e;
  }
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

const readOnlyFields = ["oid", "tallennettu", "aloitusKuulutusJulkaisut"] as (keyof DBProjekti)[] as string[];

function createExpression(expression: string, properties: string[]) {
  return properties.length > 0 ? expression + " " + properties.join(" , ") : "";
}

async function saveProjekti(dbProjekti: Partial<DBProjekti>): Promise<DocumentClient.UpdateItemOutput> {
  log.info("Updating projekti to Hassu ", { dbProjekti });
  const setExpression: string[] = [];
  const removeExpression: string[] = [];
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};

  dbProjekti.paivitetty = dayjs().toISOString();

  for (const property in dbProjekti) {
    if (readOnlyFields.indexOf(property) >= 0) {
      continue;
    }
    const value = dbProjekti[property];
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
  const data: DocumentClient.GetItemOutput = await client
    .get({
      TableName: projektiTableName,
      Key: { oid },
      ConsistentRead: true,
    })
    .promise();
  const item = data.Item as ArchivedProjektiKey;
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
  checkAndRaiseError(putResult.$response, "Arkistointi ei onnistunut");

  // Delete the archived projekti
  const removeResult = await client
    .delete({
      TableName: projektiTableName,
      Key: {
        oid,
      },
    })
    .promise();
  checkAndRaiseError(removeResult.$response, "Arkistointi ei onnistunut");
}

async function insertAloitusKuulutusJulkaisu(
  oid: string,
  julkaisu: AloitusKuulutusJulkaisu
): Promise<DocumentClient.UpdateItemOutput> {
  log.info("insertAloitusKuulutusJulkaisu", { oid, julkaisu });

  const params = {
    TableName: projektiTableName,
    Key: {
      oid,
    },
    UpdateExpression:
      "SET #aloitusKuulutusJulkaisut = list_append(if_not_exists(#aloitusKuulutusJulkaisut, :empty_list), :julkaisu)",
    ExpressionAttributeNames: {
      "#aloitusKuulutusJulkaisut": "aloitusKuulutusJulkaisut",
    },
    ExpressionAttributeValues: {
      ":julkaisu": [julkaisu],
      ":empty_list": [],
    },
  };
  log.info("Inserting aloitusKuulutusJulkaisu to projekti", { params });
  return await getDynamoDBDocumentClient().update(params).promise();
}

async function deleteAloitusKuulutusJulkaisu(projekti: DBProjekti, julkaisu: AloitusKuulutusJulkaisu): Promise<void> {
  const aloitusKuulutusJulkaisut = projekti.aloitusKuulutusJulkaisut;
  if (!aloitusKuulutusJulkaisut) {
    return;
  }
  for (let idx = 0; idx < aloitusKuulutusJulkaisut.length; idx++) {
    if (aloitusKuulutusJulkaisut[idx].id == julkaisu.id) {
      log.info("deleteAloitusKuulutusJulkaisu", { idx, julkaisu });

      const params = {
        TableName: projektiTableName,
        Key: {
          oid: projekti.oid,
        },
        UpdateExpression: "REMOVE #aloitusKuulutusJulkaisut[" + idx + "]",
        ExpressionAttributeNames: {
          "#aloitusKuulutusJulkaisut": "aloitusKuulutusJulkaisut",
        },
      };
      await getDynamoDBDocumentClient().update(params).promise();
      break;
    }
  }
}

async function updateAloitusKuulutusJulkaisu(projekti: DBProjekti, julkaisu: AloitusKuulutusJulkaisu): Promise<void> {
  const aloitusKuulutusJulkaisut = projekti.aloitusKuulutusJulkaisut;
  if (!aloitusKuulutusJulkaisut) {
    return;
  }
  for (let idx = 0; idx < aloitusKuulutusJulkaisut.length; idx++) {
    if (aloitusKuulutusJulkaisut[idx].id == julkaisu.id) {
      log.info("updateAloitusKuulutusJulkaisu", { idx, julkaisu });

      const params = {
        TableName: projektiTableName,
        Key: {
          oid: projekti.oid,
        },
        UpdateExpression: "SET #aloitusKuulutusJulkaisut[" + idx + "] = :julkaisu",
        ExpressionAttributeNames: {
          "#aloitusKuulutusJulkaisut": "aloitusKuulutusJulkaisut",
        },
        ExpressionAttributeValues: {
          ":julkaisu": julkaisu,
        },
      };
      log.info("Updating aloitusKuulutusJulkaisu to projekti", { params });
      await getDynamoDBDocumentClient().update(params).promise();
      break;
    }
  }
}

function checkAndRaiseError<T>(response: Response<T, AWSError>, msg: string) {
  if (response.error) {
    log.error(msg, { error: response.error });
    throw new Error(msg);
  }
}

export const projektiDatabase = {
  createProjekti,
  saveProjekti,
  listProjektit,
  scanProjektit,
  loadProjektiByOid,
  archiveProjektiByOid,
  insertAloitusKuulutusJulkaisu,
  deleteAloitusKuulutusJulkaisu,
  updateAloitusKuulutusJulkaisu,
};
