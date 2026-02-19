import * as sinon from "sinon";
import { SinonStub } from "sinon";

import { DeleteItemCommand, DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import * as awsClient from "../../src/aws/client";
import mocha from "mocha";
import { DBProjekti, DBPROJEKTI_OMITTED_FIELDS, NahtavillaoloVaiheJulkaisu } from "../../src/database/model";
import { getDynamoDBDocumentClient } from "../../src/aws/client";
import { config } from "../../src/config";
import omit from "lodash/omit";
import { nahtavillaoloVaiheJulkaisuDatabase } from "../../src/database/KuulutusJulkaisuDatabase";

const localDynamoDB = new DynamoDB({
  endpoint: "http://localhost:4566",
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
  region: "eu-west-1",
});
export const localDocumentClient = DynamoDBDocumentClient.from(localDynamoDB, { marshallOptions: { removeUndefinedValues: true } });

// Try to use the database configuration from deployment in
let localDynamoDBDocumentClientStub: SinonStub;

export function setupLocalDatabase(): void {
  mocha.before(() => {
    localDynamoDBDocumentClientStub = sinon.stub(awsClient, "getDynamoDBDocumentClient");
    localDynamoDBDocumentClientStub.returns(localDocumentClient);
  });
  mocha.beforeEach(() => {
    localDynamoDBDocumentClientStub.returns(localDocumentClient);
  });
}

export async function insertProjektiToDB<A extends Pick<DBProjekti, "oid">>(projekti: A) {
  const slimProjekti = omit(projekti, ...DBPROJEKTI_OMITTED_FIELDS);

  const params = new PutCommand({
    TableName: config.projektiTableName,
    Item: slimProjekti,
  });
  await getDynamoDBDocumentClient().send(params);

  const julkaisut = await nahtavillaoloVaiheJulkaisuDatabase.getAllForProjekti(projekti.oid, true);
  await nahtavillaoloVaiheJulkaisuDatabase.deleteAll(julkaisut);
  if ("nahtavillaoloVaiheJulkaisut" in projekti) {
    await nahtavillaoloVaiheJulkaisuDatabase.putAll(projekti.nahtavillaoloVaiheJulkaisut as NahtavillaoloVaiheJulkaisu[]);
  }
}

export async function removeProjektiFromDB(oid: string) {
  const params = new DeleteItemCommand({
    TableName: config.projektiTableName,
    Key: {
      oid: {
        S: oid,
      },
    },
  });
  await getDynamoDBDocumentClient().send(params);
  const julkaisut = await nahtavillaoloVaiheJulkaisuDatabase.getAllForProjekti(oid, true);
  await nahtavillaoloVaiheJulkaisuDatabase.deleteAll(julkaisut);
}

export async function getProjektiFromDB(oid: string): Promise<DBProjekti | undefined> {
  const params = new GetCommand({
    TableName: config.projektiTableName,
    Key: { oid },
    ConsistentRead: true,
  });
  const data = await getDynamoDBDocumentClient().send(params);
  const item = data.Item as DBProjekti | undefined;
  if (!item) {
    return undefined;
  }
  item.nahtavillaoloVaiheJulkaisut = await nahtavillaoloVaiheJulkaisuDatabase.getAllForProjekti(oid, true);
  return item;
}
