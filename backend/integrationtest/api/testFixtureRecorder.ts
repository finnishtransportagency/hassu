import fs from "fs";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { DBProjekti } from "../../src/database/model";
import { DocumentClient } from "aws-sdk/lib/dynamodb/document_client";
import { localDocumentClient } from "../util/databaseUtil";
import cloneDeep from "lodash/cloneDeep";
import { apiModel } from "../../../common/graphql";

export enum FixtureName {
  ALOITUSKUULUTUS = "ALOITUSKUULUTUS",
  NAHTAVILLAOLO = "NAHTAVILLAOLO",
  HYVAKSYMISPAATOS_APPROVED = "HYVAKSYMISPAATOS_APPROVED",
  JATKOPAATOS_1_ALKU = "JATKOPAATOS_1_ALKU",
}

export const MOCKED_TIMESTAMP = "2020-01-01T00:00:00+02:00";
export const MOCKED_DATE = "2022-11-03";
export const MOCKED_PDF = "pdf";

export async function recordProjektiTestFixture(fixtureName: string | FixtureName, oid: string): Promise<void> {
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  if (dbProjekti) {
    cleanupAnyProjektiData(dbProjekti);

    let oldValue: string | undefined;
    try {
      oldValue = readRecord(fixtureName);
    } catch (e) {
      // ignore
    }
    delete dbProjekti.tallennettu;
    const currentValue = JSON.stringify(dbProjekti, keySorterReplacer, 2);
    // Prevent updating file timestamp so that running tests with "watch" don't get into infinite loop
    if (!oldValue || oldValue !== currentValue) {
      fs.writeFileSync(createRecordFileName(fixtureName), currentValue);
    }
  } else {
    throw new Error(`Projektia oid ${oid} ei löytynyt!`);
  }
}

function readRecord(fixtureName: string | FixtureName): string {
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

export function cleanupAndCloneAPIProjekti(projekti: apiModel.Projekti): apiModel.Projekti {
  return cleanupAnyProjektiData(cloneDeep(projekti));
}

export function cleanupAnyProjektiData<T extends Record<string, any>>(projekti: T): T {
  replaceFieldsByName(projekti, MOCKED_TIMESTAMP, "tuotu", "paivitetty", "kuulutusVaihePaattyyPaiva", "lahetetty");
  replaceFieldsByName(projekti, MOCKED_DATE, "hyvaksymisPaiva");
  replaceFieldsByName(projekti, MOCKED_PDF, "sisalto");
  replaceFieldsByName(projekti, "salt123", "salt");
  replaceFieldsByName(projekti, "ABC123", "checksum");
  replaceFieldsByName(projekti, undefined, "isSame");
  replaceFieldsByName(projekti, 1, "versio");
  return projekti;
}

export function replaceFieldsByName(obj: Record<string, any>, value: unknown, ...fieldNames: string[]): void {
  Object.keys(obj).forEach(function (prop) {
    if (typeof obj[prop] == "object" && obj[prop] !== null) {
      replaceFieldsByName(obj[prop], value, ...fieldNames);
    } else if (fieldNames.indexOf(prop) >= 0) {
      if (value == undefined) {
        delete obj[prop];
      } else {
        obj[prop] = value;
      }
    }
  });
}

const keySorterReplacer = (key: unknown, value: unknown) =>
  value instanceof Object && !(value instanceof Array)
    ? Object.keys(value)
        .sort()
        .reduce((sorted, key) => {
          // @ts-ignore
          sorted[key] = value[key];
          return sorted;
        }, {})
    : value;
