import { DeleteCommand, GetCommand, GetCommandOutput, PutCommand, ScanCommand, ScanCommandOutput } from "@aws-sdk/lib-dynamodb";
import { getDynamoDBDocumentClient } from "../src/aws/client";
import yargs from "yargs";

const forbiddenTargetEnvs = ["dev", "test", "training", "prod"];

if (process.env.ENVIRONMENT) {
  if (forbiddenTargetEnvs.includes(process.env.ENVIRONMENT)) {
    throw new Error("Vain devaaja ympäristöt sallittu!");
  }
} else {
  throw new Error("Aseta ENVIRONMENT ympäristömuuttuja!");
}
const targetTable = "Projekti-" + process.env.ENVIRONMENT;

const cli = yargs
  .scriptName("npm run db:tool --")
  .command(
    "copy",
    "Kopioi Projekti taulun sisältö toisesta ympäristöstä",
    (argv) => {
      argv
        .positional("env", {
          type: "string",
          describe: "Ympäristön nimi",
        })
        .positional("oid", {
          type: "string",
          describe: "Projektin oid",
        })
        .demandOption("env");
    },
    function (argv) {
      copyProjektit(argv.env as string, argv.oid as string | undefined).catch((err) => console.error(err));
    }
  )
  .command("clean", "Tyhjennä " + targetTable + " taulu", function (argv) {
    deleteProjektit().catch((err) => console.error(err));
  })
  .usage("npm run db:tool -- [command]")
  .help();

// @ts-ignore
if (cli.argv._.length === 0) {
  cli.showHelp();
}
async function copyProjektit(sourceEnv: string, oid?: string) {
  let startKey;
  let items = 0;
  const sourceTable = "Projekti-" + sourceEnv;
  if (oid) {
    const data: GetCommandOutput = await getDynamoDBDocumentClient().send(new GetCommand({ Key: { oid }, TableName: sourceTable }));
    if (data.Item) {
      await getDynamoDBDocumentClient().send(
        new PutCommand({
          TableName: targetTable,
          Item: data.Item,
        })
      );
      console.log("Projekti %s kopioitu %s tauluun", oid, targetTable);
    } else {
      console.log("Projekti %s ei löydy %s taulusta", oid, sourceTable);
    }
  } else {
    do {
      const scan = new ScanCommand({
        TableName: sourceTable,
        Limit: 50,
        ExclusiveStartKey: startKey ? JSON.parse(startKey) : undefined,
      });
      const data: ScanCommandOutput = await getDynamoDBDocumentClient().send(scan);
      items += data.Items?.length ?? 0;
      for (const item of data.Items ?? []) {
        await getDynamoDBDocumentClient().send(
          new PutCommand({
            TableName: targetTable,
            Item: item,
          })
        );
      }
      startKey = data.LastEvaluatedKey ? JSON.stringify(data.LastEvaluatedKey) : undefined;
    } while (startKey);
    console.log("%d projektia kopioitu %s tauluun", items, targetTable);
  }
}

async function deleteProjektit() {
  let startKey;
  const keys = [];
  do {
    const scan = new ScanCommand({
      TableName: targetTable,
      Limit: 50,
      ExclusiveStartKey: startKey ? JSON.parse(startKey) : undefined,
    });
    const data: ScanCommandOutput = await getDynamoDBDocumentClient().send(scan);
    for (const item of data.Items ?? []) {
      keys.push(item.oid);
    }
    startKey = data.LastEvaluatedKey ? JSON.stringify(data.LastEvaluatedKey) : undefined;
  } while (startKey);
  for (const oid of keys) {
    await getDynamoDBDocumentClient().send(
      new DeleteCommand({
        TableName: targetTable,
        Key: { oid },
      })
    );
  }
  console.log("%d projektia poistettu %s taulusta", keys.length, targetTable);
}
