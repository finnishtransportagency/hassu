import fs from "fs";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { DBProjekti } from "../../src/database/model";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import { localDocumentClient } from "../util/databaseUtil";

export enum FixtureName {
  NAHTAVILLAOLO = "NAHTAVILLAOLO",
  HYVAKSYMISPAATOS_APPROVED = "HYVAKSYMISPAATOS_APPROVED",
  EPAAKTIIVINEN_1 = "EPAAKTIIVINEN_1",
}

export const MOCKED_TIMESTAMP = "2020-01-01T00:00:00+02:00";

export async function recordProjektiTestFixture(fixtureName: string | FixtureName, oid: string): Promise<void> {
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  if (dbProjekti) {
    replaceFieldsByName(dbProjekti, MOCKED_TIMESTAMP, "tuotu", "paivitetty", "kuulutusVaihePaattyyPaiva", "lahetetty");
    replaceFieldsByName(dbProjekti, "salt123", "salt");

    const oldValue = readRecord(fixtureName);
    delete dbProjekti.tallennettu;
    const currentValue = JSON.stringify(dbProjekti, null, 2);
    // Prevent updating file timestamp so that running tests with "watch" don't get into infinite loop
    if (!oldValue || oldValue !== currentValue) {
      fs.writeFileSync(createRecordFileName(fixtureName), currentValue);
    }
  } else {
    throw new Error(`Projektia oid ${oid} ei löytynyt!`);
  }
}

function readRecord(fixtureName: string | FixtureName) {
  const buffer = fs.readFileSync(createRecordFileName(fixtureName));
  return buffer.toString("utf-8");
}

function createRecordFileName(fixtureName: string | FixtureName) {
  return __dirname + "/records/" + fixtureName + ".json";
}

export async function useProjektiTestFixture(fixtureName: string | FixtureName): Promise<string> {
  const dbProjekti: DBProjekti = JSON.parse(readRecord(fixtureName));
  // Write the copied projekti to archive table
  const putParams: DocumentClient.PutItemInput = {
    TableName: process.env.TABLE_PROJEKTI || "",
    Item: dbProjekti,
  };
  await localDocumentClient.put(putParams).promise();

  return dbProjekti.oid;
}

export function replaceFieldsByName(obj: Record<string, any>, value: unknown, ...fieldNames: string[]): void {
  Object.keys(obj).forEach(function (prop) {
    if (typeof obj[prop] == "object" && obj[prop] !== null) {
      replaceFieldsByName(obj[prop], value, ...fieldNames);
    } else if (fieldNames.indexOf(prop) >= 0) {
      obj[prop] = value;
    }
  });
}
