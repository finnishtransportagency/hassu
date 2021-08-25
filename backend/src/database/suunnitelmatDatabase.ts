import { Suunnitelma } from "../model/suunnitelma";

import { DynamoDB } from "aws-sdk";

const docClient = new DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });

const suunnitelmatTableName = process.env.TABLE_SUUNNITELMAT;

async function createSuunnitelma(suunnitelma: Suunnitelma) {
  const params = {
    TableName: suunnitelmatTableName,
    Item: suunnitelma,
  };
  await docClient.put(params).promise();
}

async function listSuunnitelmat(): Promise<Suunnitelma[]> {
  const params = {
    TableName: suunnitelmatTableName,
  };
  const data = await docClient.scan(params).promise();
  return data.Items as Suunnitelma[];
}

async function getSuunnitelmaById(suunnitelmaId: string): Promise<Suunnitelma> {
  const params = {
    TableName: suunnitelmatTableName,
    Key: { id: suunnitelmaId },
  };
  try {
    const data = await docClient.get(params).promise();
    console.log(data);
    return data.Item as Suunnitelma;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function updateSuunnitelma(suunnitelma: Suunnitelma) {
  let updateExpression = "set";
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};
  for (const property in suunnitelma) {
    if (suunnitelma.hasOwnProperty(property)) {
      if (property === "id") {
        continue;
      }
      updateExpression += ` #${property} = :${property} ,`;
      ExpressionAttributeNames["#" + property] = property;
      ExpressionAttributeValues[":" + property] = suunnitelma[property];
    }
  }

  console.log(ExpressionAttributeNames);

  updateExpression = updateExpression.slice(0, -1);

  const params = {
    TableName: suunnitelmatTableName,
    Key: {
      id: suunnitelma.id,
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  };

  return docClient
    .update(params)
    .promise()
    .then((result) => {
      return result;
    });
}

export default {
  createSuunnitelma,
  updateSuunnitelma,
  listSuunnitelmat,
  getSuunnitelmaById,
};
