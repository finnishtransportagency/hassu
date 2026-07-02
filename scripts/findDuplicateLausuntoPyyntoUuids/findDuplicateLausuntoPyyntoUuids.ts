// Contains code generated or recommended by Amazon Q
/**
 * Skripti etsii projektit joissa lausuntoPyynnot- tai lausuntoPyynnonTaydennykset-taulukossa
 * on duplikaatti-uuid:ita.
 *
 * Käyttö:
 *   npx ts-node --project scripts/tsconfig.json scripts/findDuplicateLausuntoPyyntoUuids/findDuplicateLausuntoPyyntoUuids.ts
 *
 * Vaatii:
 *   - AWS_PROFILE: AWS-profiili jolla on oikeudet lukea DynamoDB-taulua
 *   - ENVIRONMENT: ympäristön nimi (dev, test, prod jne.)
 */
import { ScanCommand, ScanCommandOutput } from "@aws-sdk/lib-dynamodb";
import { getDynamoDBDocumentClient } from "../../backend/src/aws/client";

if (!process.env.ENVIRONMENT) {
  throw new Error("Aseta ENVIRONMENT ympäristömuuttuja!");
}

const tableName = "Projekti-" + process.env.ENVIRONMENT;

interface LausuntoPyynto {
  uuid: string;
  poistumisPaiva?: string;
  poistetaan?: boolean;
}

interface Projekti {
  oid: string;
  lausuntoPyynnot?: LausuntoPyynto[];
  lausuntoPyynnonTaydennykset?: LausuntoPyynto[];
}

function findDuplicateUuids(items: LausuntoPyynto[] | undefined): string[] {
  if (!items || items.length < 2) return [];
  const seen = new Map<string, number>();
  for (const item of items) {
    seen.set(item.uuid, (seen.get(item.uuid) ?? 0) + 1);
  }
  return Array.from(seen.entries())
    .filter(([, count]) => count > 1)
    .map(([uuid]) => uuid);
}

async function main() {
  const client = getDynamoDBDocumentClient();
  let lastEvaluatedKey: Record<string, unknown> | undefined;
  let scannedCount = 0;
  const results: { oid: string; field: string; duplicateUuids: string[]; items: LausuntoPyynto[] }[] = [];

  console.log(`Skannataan taulua: ${tableName}`);

  do {
    const response: ScanCommandOutput = await client.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression: "oid, lausuntoPyynnot, lausuntoPyynnonTaydennykset",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    for (const item of (response.Items ?? []) as Projekti[]) {
      const lpDuplicates = findDuplicateUuids(item.lausuntoPyynnot);
      if (lpDuplicates.length > 0) {
        results.push({
          oid: item.oid,
          field: "lausuntoPyynnot",
          duplicateUuids: lpDuplicates,
          items: item.lausuntoPyynnot!,
        });
      }

      const lptDuplicates = findDuplicateUuids(item.lausuntoPyynnonTaydennykset);
      if (lptDuplicates.length > 0) {
        results.push({
          oid: item.oid,
          field: "lausuntoPyynnonTaydennykset",
          duplicateUuids: lptDuplicates,
          items: item.lausuntoPyynnonTaydennykset!,
        });
      }
    }

    scannedCount += response.Items?.length ?? 0;
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`\nSkannattu ${scannedCount} projektia.`);

  if (results.length === 0) {
    console.log("Duplikaatti-uuid:ita ei löytynyt.");
  } else {
    console.log(`\nLöytyi ${results.length} tapausta:\n`);
    for (const result of results) {
      console.log(`OID: ${result.oid}`);
      console.log(`  Kenttä: ${result.field}`);
      console.log(`  Duplikaatti uuid:t: ${result.duplicateUuids.join(", ")}`);
      console.log(`  Kaikki rivit:`);
      for (const item of result.items) {
        console.log(`    - uuid: ${item.uuid}, poistumisPaiva: ${item.poistumisPaiva}, poistetaan: ${item.poistetaan ?? false}`);
      }
      console.log();
    }
  }
}

main().catch((e) => {
  console.error("Virhe:", e);
  process.exit(1);
});
