// Contains code generated or recommended by Amazon Q
// HUOM: Tämä skripti on tarkoitettu dev-tilillä testauskäyttöön.
//
// Palauttaa yksittäisen attribuutin arvon DynamoDB-tauluun S3-exportista.
// Käyttää UpdateCommand:ia, joten se ylikirjoittaa vain kohdeattribuutin — muu data säilyy ennallaan.
//
// Ero import-dynamodb-export.js -skriptiin:
//   - import-dynamodb-export.js tuo kokonaisia rivejä ja ohittaa jo olemassa olevat (PutItem + attribute_not_exists)
//   - Tämä skripti päivittää yhden kentän olemassa oleviin riveihin (UpdateCommand SET)
//
// Käyttötapaus: jokin attribuutti on kadonnut tai korruptoitunut kannassa ja halutaan
// palauttaa sen arvo exportista ilman koko rivin ylikirjoittamista.
//
// Käyttö:
//   Dry run:  npm run restore:attribute -- <bucket> <export-prefix> <taulu> <partition-key> <attribuutti>
//   Oikea ajo: npm run restore:attribute -- <bucket> <export-prefix> <taulu> <partition-key> <attribuutti> --execute
import { AttributeValue, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { createGunzip } from "zlib";
import { pipeline } from "stream/promises";
import { createWriteStream, createReadStream, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { Readable } from "stream";

const args: string[] = process.argv.slice(2);
const DRY_RUN: boolean = !args.includes("--execute");
const filtered: string[] = args.filter((a) => a !== "--execute");

if (filtered.length < 5) {
  console.log("Käyttö: npm run restore:attribute -- <bucket> <export-prefix> <taulu> <partition-key> <attribuutti> [--execute]");
  process.exit(1);
}

const [BUCKET, EXPORT_PREFIX, TABLE_NAME, PARTITION_KEY, ATTRIBUTE] = filtered;
const TMP_DIR = "/tmp/dynamo-import";
const region = process.env.AWS_REGION || "eu-west-1";
const s3 = new S3Client({ region });
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

async function downloadAndExtract(): Promise<string[]> {
  rmSync(TMP_DIR, { recursive: true, force: true });
  mkdirSync(TMP_DIR, { recursive: true });

  const dataPrefix = EXPORT_PREFIX.endsWith("/") ? EXPORT_PREFIX + "data/" : EXPORT_PREFIX + "/data/";
  const { Contents } = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: dataPrefix }));

  if (!Contents?.length) {
    console.log("Data-tiedostoja ei löytynyt.");
    return [];
  }

  const files: string[] = [];
  for (const obj of Contents) {
    const fileName = obj.Key!.split("/").pop()!;
    const gzPath = join(TMP_DIR, fileName);
    const jsonPath = gzPath.replace(".gz", "");
    const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: obj.Key }));
    await pipeline(Body as Readable, createWriteStream(gzPath));
    await pipeline(createReadStream(gzPath), createGunzip(), createWriteStream(jsonPath));
    files.push(jsonPath);
  }
  return files;
}

async function restoreAttribute(files: string[]): Promise<{ updated: number; skipped: number }> {
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const lines = readFileSync(file, "utf-8").split("\n").filter(Boolean);
    for (const line of lines) {
      const { Item } = JSON.parse(line) as { Item: Record<string, AttributeValue> };
      const unmarshalled = unmarshall(Item);
      const key = (unmarshalled[PARTITION_KEY] as string) || "tuntematon";
      const value = unmarshalled[ATTRIBUTE];

      if (value === undefined) {
        console.log(`Ohitettu (attribuuttia ei exportissa): ${key}`);
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`Päivitettäisiin: ${key}`);
        console.log(JSON.stringify(value, null, 2).slice(0, 500) + "\n");
        updated++;
        continue;
      }

      await dynamo.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { [PARTITION_KEY]: unmarshalled[PARTITION_KEY] },
          UpdateExpression: "SET #attr = :val",
          ExpressionAttributeNames: { "#attr": ATTRIBUTE },
          ExpressionAttributeValues: { ":val": value },
        })
      );
      console.log(`Päivitetty: ${key}`);
      updated++;
    }
  }
  return { updated, skipped };
}

async function main(): Promise<void> {
  if (DRY_RUN) console.log("DRY RUN - näytetään mitä tapahtuisi:\n");

  const files = await downloadAndExtract();
  const { updated, skipped } = await restoreAttribute(files);

  if (DRY_RUN) {
    console.log(`\nYhteensä ${updated} itemiä päivitettäisiin. Aja --execute suorittaaksesi.`);
  } else {
    console.log(`\nValmis! Päivitetty: ${updated}, ohitettu: ${skipped}`);
  }
}

main().catch(console.error);
