import fs from "fs";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { DBProjekti } from "../../src/database/model";
import { localDocumentClient } from "../util/databaseUtil";
import cloneDeep from "lodash/cloneDeep";
import { apiModel } from "../../../common/graphql";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { FileMap, fileService } from "../../src/files/fileService";
import { getS3Client } from "../../src/aws/client";

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
    readRecordAndOverWrite(dbProjekti, fixtureName, (p: DBProjekti) => {
      cleanupAnyProjektiData(p);
      delete p?.tallennettu;
      return p;
    });
  } else {
    throw new Error(`Projektia oid ${oid} ei löytynyt!`);
  }
}

const yllapitoS3recordPostfix = "_S3_yllapito";
const publicS3recordPostfix = "_S3_public";

async function recordYllapitoS3(fixtureName: string | FixtureName, oid: string): Promise<void> {
  const filemap = await fileService.listYllapitoProjektiFiles(oid, "");
  readRecordAndOverWrite(filemap, fixtureName + yllapitoS3recordPostfix, (p: FileMap) => {
    return p;
  });
}

async function recordPublicS3(fixtureName: string | FixtureName, oid: string): Promise<void> {
  const filemap = await fileService.listPublicProjektiFiles(oid, "");
  readRecordAndOverWrite(filemap, fixtureName + publicS3recordPostfix, (p: FileMap) => {
    return p;
  });
}

export async function recordProjektiAndS3s(fixtureName: string | FixtureName, oid: string): Promise<void> {
  await recordProjektiTestFixture(fixtureName, oid);
  await recordYllapitoS3(fixtureName, oid);
  await recordPublicS3(fixtureName, oid);
}

function readRecordAndOverWrite<T>(obj: T | undefined, fixtureName: string | FixtureName, cleanUpFunctions: (a: T) => T): void {
  if (obj) {
    obj = cleanUpFunctions(obj);
  }
  let oldValue: string | undefined;
  try {
    oldValue = readRecord(fixtureName);
  } catch (e) {
    // ignore
  }
  const currentValue = JSON.stringify(obj, keySorterReplacer, 2);
  // Prevent updating file timestamp so that running tests with "watch" don't get into infinite loop
  if (!oldValue || oldValue !== currentValue) {
    fs.writeFileSync(createRecordFileName(fixtureName), currentValue);
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
  const putParams = new PutCommand({
    TableName: process.env.TABLE_PROJEKTI || "",
    Item: dbProjekti,
  });
  await localDocumentClient.send(putParams);

  return dbProjekti.oid;
}

// export async function setUpS3FromFixture(fixtureName: string | FixtureName, oid: string): Promise<void> {
//   const s3yllapito : FileMap = JSON.parse(readRecord(fixtureName + yllapitoS3recordPostfix));
//   const s3public : FileMap = JSON.parse(readRecord(fixtureName + publicS3recordPostfix));
//   Object.keys(s3yllapito).forEach(fileKey => {
//     fileService.createFileToProjekti({
//       oid: string;
//       path: PathTuple;
//       fileName: fileKey
//       contents: "",
//       copyToPublic?: boolean;
//     })
//   })
// }

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
  replaceFieldsByName(projekti, "2020-12-12", "alkuperainenHyvaksymisPaiva");
  return projekti;
}

export function replaceFieldsByName(obj: Record<string, any>, value: unknown, ...fieldNames: string[]): void {
  Object.keys(obj).forEach(function (prop) {
    if (typeof obj[prop] == "object" && obj[prop] !== null && !(obj[prop] instanceof Buffer)) {
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
        .reduce((sorted: Record<string, unknown>, akey) => {
          sorted[akey] = (value as unknown as Record<string, unknown>)[akey];
          return sorted;
        }, {})
    : value;
