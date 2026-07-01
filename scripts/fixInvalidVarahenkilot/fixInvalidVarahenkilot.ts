// Contains code generated or recommended by Amazon Q
/**
 * Skripti etsii ja korjaa projektit joissa on VARAHENKILO-tyyppinen käyttäjä
 * ilman A- tai L-tunnusta (eli tunnus ei ole muotoa A[numerot] tai L[numerot]).
 *
 * Käyttö:
 *   Haku:     npx ts-node --project scripts/tsconfig.json scripts/fixInvalidVarahenkilot/fixInvalidVarahenkilot.ts
 *   Dry run:  npx ts-node --project scripts/tsconfig.json scripts/fixInvalidVarahenkilot/fixInvalidVarahenkilot.ts --dry-run
 *   Korjaus:  npx ts-node --project scripts/tsconfig.json scripts/fixInvalidVarahenkilot/fixInvalidVarahenkilot.ts --run
 *
 * Vaatii:
 *   - AWS_PROFILE: AWS-profiili jolla on oikeudet lukea ja kirjoittaa DynamoDB-taulua
 *   - ENVIRONMENT: ympäristön nimi (dev, test, prod jne.)
 */
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDBDocumentClient } from "../../backend/src/aws/client";

if (!process.env.ENVIRONMENT) {
  throw new Error("Aseta ENVIRONMENT ympäristömuuttuja!");
}

const tableName = "Projekti-" + process.env.ENVIRONMENT;
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const EXECUTE = args.includes("--run");

interface KayttoOikeus {
  kayttajatunnus: string;
  tyyppi?: string | null;
  email?: string;
  muokattavissa?: boolean;
}

interface Projekti {
  oid: string;
  versio: number;
  velho?: { nimi?: string };
  kayttoOikeudet: KayttoOikeus[];
}

interface Finding {
  projekti: Projekti;
  kayttaja: KayttoOikeus;
}

function isAorLTunnus(uid: string): boolean {
  return !!uid.match(/^A[\d]+/)?.pop() || !!uid.match(/^L[\d]+/)?.pop();
}

async function scan(): Promise<Finding[]> {
  const client = getDynamoDBDocumentClient();
  let lastEvaluatedKey: Record<string, unknown> | undefined;
  let totalProjektit = 0;
  const findings: Finding[] = [];

  console.log(`Skannataan taulu: ${tableName}\n`);

  do {
    const response = await client.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression: "oid, versio, velho.nimi, kayttoOikeudet",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    for (const item of (response.Items ?? []) as Projekti[]) {
      totalProjektit++;
      for (const ko of item.kayttoOikeudet ?? []) {
        if (ko.tyyppi === "VARAHENKILO" && !isAorLTunnus(ko.kayttajatunnus)) {
          findings.push({ projekti: item, kayttaja: ko });
        }
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`Skannattiin ${totalProjektit} projektia.`);
  console.log(`Löytyi ${findings.length} virheellistä varahenkilöä:\n`);

  for (const f of findings) {
    console.log(`Projekti: ${f.projekti.velho?.nimi ?? "?"}`);
    console.log(`  OID:            ${f.projekti.oid}`);
    console.log(`  Käyttäjätunnus: ${f.kayttaja.kayttajatunnus}`);
    console.log(`  Email:          ${f.kayttaja.email ?? "-"}`);
    console.log(`  Muokattavissa:  ${f.kayttaja.muokattavissa}`);
    console.log("");
  }

  return findings;
}

async function fix(findings: Finding[], dryRun: boolean): Promise<void> {
  const client = getDynamoDBDocumentClient();

  if (dryRun) {
    console.log("DRY RUN - näytetään mitä tapahtuisi:\n");
  }

  for (const { projekti, kayttaja } of findings) {
    const updatedKayttoOikeudet = projekti.kayttoOikeudet.map((ko) => {
      if (ko.kayttajatunnus === kayttaja.kayttajatunnus) {
        const { tyyppi: _removed, ...rest } = ko;
        return rest;
      }
      return ko;
    });

    if (dryRun) {
      console.log(`Päivitettäisiin: ${projekti.velho?.nimi ?? projekti.oid}`);
      console.log(`  ${kayttaja.kayttajatunnus}: tyyppi VARAHENKILO -> poistetaan`);
      continue;
    }

    await client.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { oid: projekti.oid },
        UpdateExpression: "SET kayttoOikeudet = :kayttoOikeudet",
        ExpressionAttributeValues: { ":kayttoOikeudet": updatedKayttoOikeudet },
      })
    );
    console.log(`Päivitetty: ${projekti.velho?.nimi ?? projekti.oid} (${kayttaja.kayttajatunnus})`);
  }

  if (dryRun) {
    console.log(`\nYhteensä ${findings.length} päivitystä. Aja --run suorittaaksesi oikeat muutokset.`);
  } else {
    console.log(`\nValmis! Päivitetty ${findings.length} käyttäjää.`);
  }
}

async function main() {
  const findings = await scan();

  if (findings.length === 0) {
    console.log("Ei korjattavaa.");
    return;
  }

  if (DRY_RUN || EXECUTE) {
    await fix(findings, DRY_RUN);
  } else {
    console.log("Aja --dry-run nähdäksesi muutokset tai --run tehdäksesi ne.");
  }
}

main().catch((e) => {
  console.error("Virhe:", e);
  process.exit(1);
});
