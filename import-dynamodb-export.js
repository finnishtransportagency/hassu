// Contains code generated or recommended by Amazon Q
// HUOM: Tämä skripti on tarkoitettu dev-tilillä testauskäyttöön.
// Tarkoitettu DynamoDB:n Export to S3 -toiminnon tuottaman datan tuomiseen takaisin DynamoDB-tauluun.
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { S3Client, GetObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { createGunzip } = require("zlib");
const { pipeline } = require("stream/promises");
const { createWriteStream, createReadStream, mkdirSync, readFileSync, rmSync } = require("fs");
const { join, resolve, normalize } = require("path");

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--execute");
const filtered = args.filter((a) => a !== "--execute");

if (filtered.length < 4) {
  console.log("Käyttö: npm run import:dynamodb -- <bucket> <export-prefix> <taulu> <partition-key> [--execute]");
  console.log("");
  console.log("Dry run (näyttää mitä tuotaisiin, ei kirjoita kantaan):");
  console.log("  npm run import:dynamodb -- hassu-riikka-internal AWSDynamoDB/01770177 Projekti-riikka oid");
  console.log("");
  console.log("Oikea ajo (kirjoittaa kantaan):");
  console.log("  npm run import:dynamodb -- hassu-riikka-internal AWSDynamoDB/01770177 Projekti-riikka oid --execute");
  process.exit(1);
}

const [BUCKET, EXPORT_PREFIX, TABLE_NAME, PARTITION_KEY] = filtered;

const region = process.env.AWS_REGION || "eu-west-1";
const s3 = new S3Client({ region });
const dynamo = new DynamoDBClient({ region });
const TMP_DIR = "/tmp/dynamo-import";

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
    const gzPath = resolve(TMP_DIR, normalize(fileName));
    if (!gzPath.startsWith(resolve(TMP_DIR))) {
      console.log(`Ohitettu (epäilyttävä polku): ${fileName}`);
      continue;
    }
    const jsonPath = gzPath.replace(".gz", "");

    const { Body } = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: obj.Key }));
    await pipeline(Body, createWriteStream(gzPath));
    await pipeline(createReadStream(gzPath), createGunzip(), createWriteStream(jsonPath));

    files.push(jsonPath);
    console.log(`Ladattu ja purettu: ${fileName}`);
  }
  return files;
}

async function importItems(files) {
  let imported = 0;
  let skipped = 0;

  for (const file of files) {
    const lines = readFileSync(file, "utf-8").split("\n").filter(Boolean);
    for (const line of lines) {
      const { Item } = JSON.parse(line);
      const key = Item[PARTITION_KEY]?.S || "tuntematon";

      if (DRY_RUN) {
        console.log(`Tuotaisiin: ${key}`);
        imported++;
        continue;
      }

      try {
        await dynamo.send(
          new PutItemCommand({
            TableName: TABLE_NAME,
            Item,
            ConditionExpression: `attribute_not_exists(${PARTITION_KEY})`,
          })
        );
        console.log(`Tuotu: ${key}`);
        imported++;
      } catch (e) {
        if (e.name === "ConditionalCheckFailedException") {
          console.log(`Ohitettu (jo olemassa): ${key}`);
          skipped++;
        } else {
          throw e;
        }
      }
    }
  }
  return { imported, skipped };
}

async function main() {
  if (DRY_RUN) {
    console.log("DRY RUN - näytetään mitä tapahtuisi:\n");
  }

  const files = await downloadAndExtract();
  const { imported, skipped } = await importItems(files);

  if (DRY_RUN) {
    console.log(`\nYhteensä ${imported} itemiä tuotaisiin. Aja --execute suorittaaksesi.`);
  } else {
    console.log(`\nValmis! Tuotu: ${imported}, ohitettu: ${skipped}`);
  }
}

main().catch(console.error);
