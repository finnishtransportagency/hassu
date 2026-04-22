// Contains code generated or recommended by Amazon Q
/**
 * Recreate and print (to stdout) muistutus emails: the email sent to kirjaamo and,
 * if the muistuttaja provided an email address, the confirmation email sent to them.
 * Read-only: does not send emails or modify any data.
 *
 * Usage:
 *   npx ts-node --project scripts/tsconfig.json scripts/recreateMuistutusEmail.ts <oid> <muistuttajaId> [--kuittaus]
 *
 * Options:
 *   --kuittaus  Also print the confirmation email sent to the muistuttaja
 *
 * Requires:
 *   - AWS_PROFILE set to the correct account
 *   - ENVIRONMENT (used for SSM parameter paths and table name defaults)
 *   - AWS_REGION (defaults to eu-west-1)
 *   - TABLE_PROJEKTI (defaults to Projekti-<ENVIRONMENT>)
 *   - TABLE_PROJEKTI_MUISTUTTAJA (defaults to ProjektiMuistuttaja-<ENVIRONMENT>)
 *   - FRONTEND_DOMAIN_NAME (defaults to value from SSM /<ENVIRONMENT>/FrontendDomainName)
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SSM } from "@aws-sdk/client-ssm";
import { createMuistutusKirjaamolleEmail, createKuittausMuistuttajalleEmail } from "../backend/src/email/emailTemplates";
import { DBProjekti, Muistutus } from "../backend/src/database/model";
import { DBMuistuttaja } from "../backend/src/database/muistuttajaDatabase";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const showKuittaus = process.argv.includes("--kuittaus");
const [oid, muistuttajaId] = args;

if (!oid || !muistuttajaId) {
  console.error("Usage: npx ts-node --project scripts/tsconfig.json scripts/recreateMuistutusEmail.ts <oid> <muistuttajaId> [--kuittaus]");
  process.exit(1);
}

const env = process.env.ENVIRONMENT;
const projektiTable = process.env.TABLE_PROJEKTI ?? `Projekti-${env}`;
const muistuttajaTable = process.env.TABLE_PROJEKTI_MUISTUTTAJA ?? `ProjektiMuistuttaja-${env}`;

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION ?? "eu-west-1" }));
const ssm = new SSM({ region: "eu-west-1" });

function muistuttajaToMuistutus(m: DBMuistuttaja): Muistutus {
  return {
    id: m.id,
    vastaanotettu: m.vastaanotettu ?? m.lisatty,
    etunimi: m.etunimi,
    sukunimi: m.sukunimi,
    katuosoite: m.lahiosoite,
    postinumero: m.postinumero,
    postitoimipaikka: m.postitoimipaikka,
    sahkoposti: m.sahkoposti,
    muistutus: m.muistutus,
    liitteet: m.liitteet,
    maakoodi: m.maakoodi,
    puhelinnumero: m.puhelinnumero,
  };
}

async function getKirjaamoSahkoposti(projekti: DBProjekti): Promise<string> {
  const viranomainen = projekti.velho?.suunnittelustaVastaavaViranomainen;
  if (!viranomainen) {
    throw new Error("suunnittelustaVastaavaViranomainen not set on projekti");
  }
  const response = await ssm.getParameter({ Name: "/kirjaamoOsoitteet" });
  const kirjaamot = JSON.parse(response.Parameter?.Value ?? "[]");
  const match = kirjaamot.find((k: { nimi: string }) => k.nimi.toString() === viranomainen.toString());
  if (!match?.sahkoposti) {
    throw new Error(`Kirjaamo email not found for viranomainen: ${viranomainen}`);
  }
  return match.sahkoposti;
}

async function ensureFrontendDomainName() {
  if (!process.env.FRONTEND_DOMAIN_NAME) {
    const paramName = `/${env}/FrontendDomainName`;
    console.log(`FRONTEND_DOMAIN_NAME not set, fetching from SSM ${paramName}...`);
    const response = await ssm.getParameter({ Name: paramName });
    const value = response.Parameter?.Value?.split(",")?.[0]?.trim();
    if (!value) throw new Error(`SSM parameter ${paramName} not found`);
    process.env.FRONTEND_DOMAIN_NAME = value;
  }
}

async function main() {
  await ensureFrontendDomainName();

  console.log(`Fetching projekti ${oid} from ${projektiTable}...`);
  const projektiResult = await ddbClient.send(new GetCommand({ TableName: projektiTable, Key: { oid } }));
  const projekti = projektiResult.Item as DBProjekti | undefined;
  if (!projekti) {
    throw new Error(`Projekti not found: ${oid}`);
  }

  console.log(`Fetching muistuttaja ${muistuttajaId} from ${muistuttajaTable}...`);
  const muistuttajaResult = await ddbClient.send(
    new GetCommand({ TableName: muistuttajaTable, Key: { oid, id: muistuttajaId } })
  );
  const muistuttaja = muistuttajaResult.Item as DBMuistuttaja | undefined;
  if (!muistuttaja) {
    throw new Error(`Muistuttaja not found: oid=${oid}, id=${muistuttajaId}`);
  }

  const muistutus = muistuttajaToMuistutus(muistuttaja);
  const sahkoposti = await getKirjaamoSahkoposti(projekti);

  const sep = "==========";

  const kirjaamoEmail = createMuistutusKirjaamolleEmail(projekti, muistutus, sahkoposti);
  console.log(`\n${sep} KIRJAAMO EMAIL ${sep}`);
  console.log(`To: ${kirjaamoEmail.to}`);
  console.log(`Subject: ${kirjaamoEmail.subject}`);
  console.log(`\n${kirjaamoEmail.text}`);
  console.log(`${sep} END KIRJAAMO EMAIL ${sep}`);

  if (showKuittaus && muistutus.sahkoposti) {
    const kuittausEmail = createKuittausMuistuttajalleEmail(projekti, muistutus);
    console.log(`\n${sep} KUITTAUS MUISTUTTAJALLE ${sep}`);
    console.log(`To: ${kuittausEmail.to}`);
    console.log(`Subject: ${kuittausEmail.subject}`);
    console.log(`\n${kuittausEmail.text}`);
    console.log(`${sep} END KUITTAUS MUISTUTTAJALLE ${sep}`);
  }

  if (muistutus.liitteet?.length) {
    const bucket = `hassu-${env}-yllapito`;
    const prefix = `yllapito/tiedostot/projekti/${oid}`;
    console.log(`\n⚠ Muistutuksella on ${muistutus.liitteet.length} liitettä (ei sisällytetty tähän):`);
    muistutus.liitteet.forEach((l) => console.log(`  - s3://${bucket}/${prefix}/${l}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
