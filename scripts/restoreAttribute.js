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
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, GetObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { createGunzip } = require("zlib");
const { pipeline } = require("stream/promises");
const { createWriteStream, createReadStream, mkdirSync, rmSync, readFileSync } = require("fs");
const { join } = require("path");

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--execute");
const filtered = args.filter((a) => a !== "--execute");

if (filtered.length < 5) {
  console.log("Käyttö: npm run restore:attribute -- <bucket> <export-prefix> <taulu> <partition-key> <attribuutti> [--execute]");
  process.exit(1);
}

const [BUCKET, EXPORT_PREFIX, TABLE_NAME, PARTITION_KEY, ATTRIBUTE] = filtered;
const TMP_DIR = "/tmp/dynamo-import";
const region = process.env.AWS_REGION || "eu-west-1";
const s3 = new S3Client({ region });
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

async function downloadAndExtract() {
  rmSync(TMP_DIR, { recursive: true, force: true });
  mkdirSync(TMP_DIR, { recursive: true });

  const dataPrefix = EXPORT_PREFIX.endsWith("/") ? EXPORT_PREFIX + "data/" : EXPORT_PREFIX + "/data/";
  const { Contents } = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: dataPrefix }));

  if (!Contents?.length) {
    console.log("Data-tiedostoja ei löytynyt.");
    return [];
  }

  const files = [];
  for (const obj of Contents) {
    const fileName = obj.Key.split("/").pop();
    const gzPath = join(TMP_DIR, fileName);
    const jsonPath = gzPath.replace(".gz", "");
    const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: obj.Key }));
    await pipeline(Body, createWriteStream(gzPath));
    await pipeline(createReadStream(gzPath), createGunzip(), createWriteStream(jsonPath));
    files.push(jsonPath);
  }
  return files;
}

async function restoreAttribute(files) {
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const lines = readFileSync(file, "utf-8").split("\n").filter(Boolean);
    for (const line of lines) {
      const { Item } = JSON.parse(line);
      const unmarshalled = unmarshall(Item);
      const key = unmarshalled[PARTITION_KEY] || "tuntematon";
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

async function main() {
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
