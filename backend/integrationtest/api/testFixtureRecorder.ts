import fs from "fs";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { DBProjekti } from "../../src/database/model";
import { localDocumentClient } from "../util/databaseUtil";
import cloneDeep from "lodash/cloneDeep";
import { apiModel } from "../../../common/graphql";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { FileMap, fileService } from "../../src/files/fileService";
import { ProjektiPaths } from "../../src/files/ProjektiPath";
import { config } from "../../src/config";
import dayjs from "dayjs";
import { AsiakirjaTyyppi } from "../../../common/graphql/apiModel";

export enum FixtureName {
  PERUSTIEDOT = "PERUSTIEDOT",
  ALOITUSKUULUTUS = "ALOITUSKUULUTUS",
  ALOITUSKUULUTUS_UUDELLEENKUULUTETTU = "ALOITUSKUULUTUS_UUDELLEENKUULUTETTU",
  NAHTAVILLAOLO = "NAHTAVILLAOLO",
  HYVAKSYMISPAATOS_APPROVED = "HYVAKSYMISPAATOS_APPROVED",
  JATKOPAATOS_1_ALKU = "JATKOPAATOS_1_ALKU",
}

type ProjektiRecord = { projekti: DBProjekti; yllapitoFiles: FileMap; publicFiles: FileMap };

const MOCKED_TIMESTAMP = "2020-01-01T00:00:00+02:00";
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

    const yllapitoFiles = await fileService.listYllapitoProjektiFiles(oid, "");
    const publicFiles = await fileService.listPublicProjektiFiles(oid, "", true);

    const record: ProjektiRecord = {
      projekti: dbProjekti,
      yllapitoFiles: removeChecksums(yllapitoFiles),
      publicFiles: removeChecksums(publicFiles),
    };
    const currentValue = JSON.stringify(record, keySorterReplacer, 2);
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

async function putFilesToProjekti(oid: string, files: FileMap, bucketName: string) {
  const path = new ProjektiPaths(oid);
  await Promise.all(
    Object.keys(files).map(async (projektiFileName) => {
      const file = files[projektiFileName];
      let contents: Buffer;
      if (file.ContentType == "image/png") {
        contents = fs.readFileSync(__dirname + "/../files/logo.png");
      } else {
        contents = Buffer.from([]);
      }
      await fileService.createFileToProjekti({
        oid,
        fileName: projektiFileName,
        contentType: file.ContentType,
        inline: !!file.ContentDisposition,
        path,
        publicationTimestamp: file.publishDate ? dayjs(file.publishDate) : undefined,
        expirationDate: file.expirationDate ? dayjs(file.expirationDate) : undefined,
        contents,
        bucketName,
        fileType: file.fileType,
        asiakirjaTyyppi: file.asiakirjaTyyppi as AsiakirjaTyyppi,
      });
    })
  );
}

export async function useProjektiTestFixture(fixtureName: string | FixtureName): Promise<string> {
  const record: ProjektiRecord = JSON.parse(readRecord(fixtureName));
  const { projekti: dbProjekti, yllapitoFiles, publicFiles } = record;

  const oid = dbProjekti.oid;
  await fileService.deleteProjekti(oid);

  // Write the copied projekti to archive table
  const putParams = new PutCommand({
    TableName: process.env.TABLE_PROJEKTI || "",
    Item: dbProjekti,
  });
  await localDocumentClient.send(putParams);

  await putFilesToProjekti(oid, yllapitoFiles, config.yllapitoBucketName);
  await putFilesToProjekti(oid, publicFiles, config.publicBucketName);

  return oid;
}

export function cleanupAndCloneAPIProjekti(projekti: apiModel.Projekti): apiModel.Projekti {
  return cleanupAnyProjektiData(cloneDeep(projekti));
}

export function cleanupAnyProjektiData<T extends Record<string, unknown>>(projekti: T): T {
  replaceFieldsByName(projekti, MOCKED_TIMESTAMP, "paivitetty");
  replaceFieldsByName(projekti, MOCKED_PDF, "sisalto");
  replaceFieldsByName(projekti, "salt123", "salt");
  replaceFieldsByName(projekti, "ABC123", "checksum");
  replaceFieldsByName(projekti, undefined, "isSame");
  replaceFieldsByName(projekti, 1, "versio");
  return projekti;
}

export function replaceFieldsByName(obj: Record<string, unknown>, value: unknown, ...fieldNames: string[]): void {
  Object.keys(obj).forEach(function (prop) {
    if (typeof obj[prop] == "object" && obj[prop] !== null && !(obj[prop] instanceof Buffer)) {
      replaceFieldsByName(obj[prop] as Record<string, unknown>, value, ...fieldNames);
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

function removeChecksums(files: FileMap): FileMap {
  Object.keys(files).forEach(async (projektiFileName) => {
    const file = files[projektiFileName];
    delete file.checksum;
  });
  return files;
}
