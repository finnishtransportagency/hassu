// Contains code generated or recommended by Amazon Q
/// <reference types="node" />
/**
 * Toistaa tuotannon zip-socket-kapasiteettiongelman (HASSU-439 / selvitys 15/2025).
 *
 * Tausta:
 *   zipFiles.ts:n generateAndStreamZipfileToS3 avaa kaikki S3 GetObject -pyynnöt
 *   samanaikaisesti Promise.all:lla. Node.js HTTP-agentin maxSockets=50, joten
 *   yli 50 tiedostolla pyyntöjä jonoutuu. Jos käsittely kestää >3s, SDK logaa
 *   varoituksen "socket usage at capacity=50 and N additional requests are enqueued".
 *   Pahimmillaan tämä aiheuttaa socket hang up -virheitä ja zippaus epäonnistuu.
 *
 *   Nykyisellä SDK-versiolla (3.1002) ja 2048 MB muistilla lambda on niin nopea,
 *   ettei varoitusta synny. Ongelman toistamiseen tarvitaan --throttle joka pudottaa
 *   lambdan muistin 128 MB:iin → CPU hidastuu ~16x → socketit pysyvät varattuna
 *   riittävän pitkään.
 *
 * Työnkulku:
 *   1. Aja ilman flageja → luo testitiedostot S3:ään ja päivittää DynamoDB:n
 *   2. --throttle  → pudottaa lambdan muistin 128 MB:iin (simuloi resurssipulaa)
 *   3. --trigger   → lähettää ZIP_NAHTAVILLAOLO SQS-eventin
 *   4. Tarkista CloudWatch-logeista socket-varoitukset/virheet
 *   5. --unthrottle → palauttaa lambdan muistin normaaliksi (2048 MB)
 *   6. --cleanup   → poistaa testitiedostot ja palauttaa DynamoDB:n
 *
 * Käyttö:
 *   npx ts-node --project scripts/tsconfig.json scripts/reproduceZipSocketIssue/reproduceZipSocketIssue.ts <oid> <nahtavillaolo-id>
 *   npx ts-node --project scripts/tsconfig.json scripts/reproduceZipSocketIssue/reproduceZipSocketIssue.ts <oid> <nahtavillaolo-id> --throttle
 *   npx ts-node --project scripts/tsconfig.json scripts/reproduceZipSocketIssue/reproduceZipSocketIssue.ts <oid> <nahtavillaolo-id> --trigger
 *   npx ts-node --project scripts/tsconfig.json scripts/reproduceZipSocketIssue/reproduceZipSocketIssue.ts <oid> <nahtavillaolo-id> --unthrottle
 *   npx ts-node --project scripts/tsconfig.json scripts/reproduceZipSocketIssue/reproduceZipSocketIssue.ts <oid> <nahtavillaolo-id> --cleanup
 *
 * Vaatimukset:
 *   - AWS_PROFILE asetettu oikealle kehitystilille
 *   - ENVIRONMENT (tai TABLE_PROJEKTI / YLLAPITO_BUCKET_NAME / EVENT_SQS_URL)
 *   - Projekti jolla on nahtavillaoloVaihe DynamoDB:ssä (ei tarvitse olla julkaistu)
 *
 * HUOM: Käytä VAIN kehitysympäristössä!
 */
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { LambdaClient, UpdateFunctionConfigurationCommand, GetFunctionConfigurationCommand } from "@aws-sdk/client-lambda";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";

const REGION = "eu-west-1";
const FILE_COUNT = 300;

const env = process.env.ENVIRONMENT;
if (!env) {
  console.error("ENVIRONMENT-ympäristömuuttuja puuttuu. Aseta se ennen ajoa.");
  process.exit(1);
}
if (env === "prod" || env === "production") {
  console.error("Tätä skriptiä EI saa ajaa tuotantoympäristössä!");
  process.exit(1);
}

const BUCKET = process.env.YLLAPITO_BUCKET_NAME ?? `hassu-${env}-internal`;
const TABLE = process.env.TABLE_PROJEKTI ?? `Projekti-${env}`;
const SQS_URL = process.env.EVENT_SQS_URL ?? "";

const LAMBDA_FUNCTION_NAME = `hassu-sqs-event-handler-${env}`;
const THROTTLED_MEMORY = 128;
const NORMAL_MEMORY = 2048;

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const cleanup = process.argv.includes("--cleanup");
const trigger = process.argv.includes("--trigger");
const throttle = process.argv.includes("--throttle");
const unthrottle = process.argv.includes("--unthrottle");

const [oid, nahtavillaoloId] = args;

if (!oid || !nahtavillaoloId) {
  console.error(
    "Käyttö: ts-node reproduceZipSocketIssue.ts <projekti-oid> <nahtavillaolo-id> [--throttle|--trigger|--unthrottle|--cleanup]"
  );
  process.exit(1);
}

const s3Prefix = `yllapito/tiedostot/projekti/${oid}/nahtavillaolo/${nahtavillaoloId}`;
const backupFile = `/tmp/hassu-zip-test-backup-${oid.replace(/\./g, "_")}.json`;

const s3 = new S3Client({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const sqs = new SQSClient({ region: REGION });
const lambda = new LambdaClient({ region: REGION });

function buildTestAineistot() {
  return Array.from({ length: FILE_COUNT }, (_, i) => ({
    dokumenttiOid: `test-doc-${i + 1}`,
    kategoriaId: "osa_a",
    tiedosto: `/nahtavillaolo/${nahtavillaoloId}/test_aineisto_${i + 1}.pdf`,
    nimi: `test_aineisto_${i + 1}.pdf`,
    uuid: `test-uuid-${i + 1}`,
    tuotu: "2025-04-05T12:00",
    jarjestys: i + 1,
    tila: "VALMIS",
  }));
}

async function backupOriginalAineistot(): Promise<void> {
  console.log("1. Varmuuskopioidaan alkuperäinen aineistoNahtavilla...");
  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE,
      Key: { oid },
      ProjectionExpression: "nahtavillaoloVaihe.aineistoNahtavilla",
    })
  );
  const original = result.Item?.nahtavillaoloVaihe?.aineistoNahtavilla ?? [];
  writeFileSync(backupFile, JSON.stringify(original, null, 2));
  console.log(`   Varmuuskopioitu: ${backupFile} (${original.length} aineistoa)`);
}

async function uploadTestFiles(): Promise<void> {
  console.log(`2. Kopioidaan ${FILE_COUNT} tiedostoa (5 MB/kpl) S3:ään...`);
  const body = Buffer.alloc(5 * 1024 * 1024, "x"); // 5 MB per tiedosto

  for (let i = 1; i <= FILE_COUNT; i++) {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: `${s3Prefix}/test_aineisto_${i}.pdf`,
        Body: body,
      })
    );
    if (i % 25 === 0) {
      console.log(`   ...${i}/${FILE_COUNT} kopioitu`);
    }
  }
  console.log(`   Kaikki ${FILE_COUNT} tiedostoa kopioitu.`);
}

async function updateDynamoDB(): Promise<void> {
  console.log("3. Päivitetään DynamoDB nahtavillaoloVaihe.aineistoNahtavilla...");
  const aineistot = buildTestAineistot();
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { oid },
      UpdateExpression: "SET nahtavillaoloVaihe.aineistoNahtavilla = :aineistot",
      ExpressionAttributeValues: { ":aineistot": aineistot },
    })
  );
  console.log(`   Päivitetty ${aineistot.length} aineistoa DynamoDB:hen.`);
}

async function doCleanup(): Promise<void> {
  console.log("=== PURKAMINEN ===");

  console.log(`Poistetaan ${FILE_COUNT} testitiedostoa S3:stä...`);
  for (let i = 1; i <= FILE_COUNT; i++) {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: `${s3Prefix}/test_aineisto_${i}.pdf`,
      })
    );
    if (i % 25 === 0) {
      console.log(`   ...${i}/${FILE_COUNT} poistettu`);
    }
  }

  if (existsSync(backupFile)) {
    console.log("Palautetaan alkuperäinen aineistoNahtavilla varmuuskopiosta...");
    const original = JSON.parse(readFileSync(backupFile, "utf-8"));
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { oid },
        UpdateExpression: "SET nahtavillaoloVaihe.aineistoNahtavilla = :aineistot",
        ExpressionAttributeValues: { ":aineistot": original },
      })
    );
    unlinkSync(backupFile);
    console.log("DynamoDB palautettu alkuperäiseen tilaan.");
  } else {
    console.warn(`VAROITUS: Varmuuskopiota ei löydy (${backupFile}).`);
    console.warn("DynamoDB:n aineistoNahtavilla pitää palauttaa manuaalisesti.");
  }

  console.log("Purkaminen valmis.");
}

async function doTrigger(): Promise<void> {
  if (!SQS_URL) {
    console.error("EVENT_SQS_URL ei ole asetettu. Aseta se .env.local:sta tai ympäristömuuttujana.");
    process.exit(1);
  }
  console.log("Lähetetään ZIP_NAHTAVILLAOLO SQS-eventti...");
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: SQS_URL,
      MessageBody: JSON.stringify({ oid, type: "ZIP_NAHTAVILLAOLO" }),
      MessageGroupId: oid,
      MessageDeduplicationId: Date.now().toString(),
    })
  );
  console.log("SQS-eventti lähetetty. Tarkista lambdan lokeista:");
  console.log("  'WARN - socket usage at capacity=50 and N additional requests are enqueued'");
}

async function doThrottle(): Promise<void> {
  const current = await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: LAMBDA_FUNCTION_NAME }));
  console.log(`Lambda ${LAMBDA_FUNCTION_NAME} nykyinen muisti: ${current.MemorySize} MB`);
  console.log(`Asetetaan muisti ${THROTTLED_MEMORY} MB:iin (kuristus)...`);
  await lambda.send(
    new UpdateFunctionConfigurationCommand({
      FunctionName: LAMBDA_FUNCTION_NAME,
      MemorySize: THROTTLED_MEMORY,
    })
  );
  console.log(`Muisti asetettu ${THROTTLED_MEMORY} MB:iin. Lambda saa nyt ~1/16 CPU:sta.`);
}

async function doUnthrottle(): Promise<void> {
  console.log(`Palautetaan lambda ${LAMBDA_FUNCTION_NAME} muisti ${NORMAL_MEMORY} MB:iin...`);
  await lambda.send(
    new UpdateFunctionConfigurationCommand({
      FunctionName: LAMBDA_FUNCTION_NAME,
      MemorySize: NORMAL_MEMORY,
    })
  );
  console.log(`Muisti palautettu ${NORMAL_MEMORY} MB:iin.`);
}

async function main(): Promise<void> {
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Table: ${TABLE}`);
  console.log(`Projekti: ${oid}`);
  console.log(`Nähtävilläolo ID: ${nahtavillaoloId}`);
  console.log(`S3-polku: ${s3Prefix}`);
  console.log("");

  if (cleanup) {
    await doCleanup();
    return;
  }

  if (throttle) {
    await doThrottle();
    return;
  }

  if (unthrottle) {
    await doUnthrottle();
    return;
  }

  if (trigger) {
    await doTrigger();
    return;
  }

  // Setup
  await backupOriginalAineistot();
  await uploadTestFiles();
  await updateDynamoDB();

  const cmd = `npx ts-node --project scripts/tsconfig.json scripts/reproduceZipSocketIssue/reproduceZipSocketIssue.ts ${oid} ${nahtavillaoloId}`;
  console.log("");
  console.log("=== Valmis! ===");
  console.log("");
  console.log("Seuraavat vaiheet:");
  console.log("");
  console.log("  1. Kuristus (pudottaa lambdan muistin 128 MB → hidas CPU simuloi tuotannon resurssipulaa):");
  console.log(`     ${cmd} --throttle`);
  console.log("");
  console.log("  2. Laukaise zippaus:");
  console.log(`     ${cmd} --trigger`);
  console.log("");
  console.log("  3. Tarkista CloudWatch-lokit (socket hang up / capacity varoitukset)");
  console.log("");
  console.log("  4. Palauta lambdan muisti normaaliksi:");
  console.log(`     ${cmd} --unthrottle`);
  console.log("");
  console.log("  5. Siivoa testitiedostot ja palauta DynamoDB:");
  console.log(`     ${cmd} --cleanup`);
}

main().catch((err) => {
  console.error("Virhe:", err);
  process.exit(1);
});
