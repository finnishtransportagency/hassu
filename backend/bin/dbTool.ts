import { PutCommand, ScanCommand, ScanCommandOutput } from "@aws-sdk/lib-dynamodb";
import { getDynamoDBDocumentClient } from "../src/aws/client";
import yargs from "yargs";

const targetTable = "Projekti-" + process.env.ENVIRONMENT;
const forbiddenEnvs = ["dev", "test", "training", "prod"];

if (process.env.ENVIRONMENT) {
  if (forbiddenEnvs.includes(process.env.ENVIRONMENT)) {
    throw new Error("Vain devaaja ympäristöt sallittu!");
  }
} else {
  throw new Error("Aseta ENVIRONMENT ympäristömuuttuja");
}

yargs
  .scriptName("npm run db:tool")
  .command(
    "copy",
    "Kopioi Projekti taulun sisältö toisesta ympäristöstä",
    (argv) => {
      argv.positional("env", {
        type: "string",
        describe: "Ympäristön nimi",
      }).positional("id", {
        type: "string",
        describe: "Projektin id",
      });
    },
    function (argv) {
      copyProjektit(argv.env as string)
        .then(() => console.log("Valmis."))
        .catch((err) => console.error(err));
    }
  )
  .help().argv;

async function copyProjektit(sourceEnv: string) {
  let startKey;
  let items = 0;
  do {
    const scan = new ScanCommand({
      TableName: "Projekti-" + sourceEnv,
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
