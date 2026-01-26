/* tslint:disable:no-console */
import cloneDeep from "lodash/cloneDeep";
import { DBProjekti } from "../src/database/model";
import yargs from "yargs";
import { TestProjektiDatabase } from "../src/database/testProjektiDatabase";
import { migrateFromOldSchema } from "../src/database/projektiSchemaUpdate";
import isEqual from "lodash/isEqual";
var fs = require("node:fs");

yargs
  .scriptName("npm run upgradeDatabase")
  .command(
    "dryRun [env]",
    "Älä kirjoita tietokantaan, tulosta vain eroavaisuudet",
    (argv) => {
      argv.positional("env", {
        type: "string",
        describe: "Ympäristön nimi",
      });
    },
    function (argv) {
      upgradeDatabase(true, argv.env as string)
        .then(() => console.log("Valmis."))
        .catch((err) => console.error(err));
    }
  )
  .command(
    "run [env]",
    "Kirjoita päivitykset tietokantaan",
    (argv) => {
      argv.positional("env", {
        type: "string",
        describe: "Ympäristön nimi",
      });
    },
    function (argv) {
      upgradeDatabase(false, argv.env as string)
        .then(() => console.log("Valmis."))
        .catch((err) => console.error(err));
    }
  )
  .help().argv;

async function upgradeDatabase(dryRun: boolean, envName: string) {
  const projektiDatabase = new TestProjektiDatabase("Projekti-" + envName, "not-used");
  let startKey;
  do {
    const scanResult: { startKey: string | undefined; projektis: DBProjekti[] } = await projektiDatabase.scanProjektit(startKey);
    startKey = scanResult.startKey;
    let projektis = scanResult.projektis;
    for (const projekti of projektis) {
      let fixed: DBProjekti = migrateFromOldSchema(cloneDeep(projekti), true);
      console.group("Projekti " + fixed.oid);
      let hasChanges = false;
      if (!isEqual(fixed, projekti)) {
        hasChanges = true;

        const folderName = `${envName}`;
        try {
          if (!fs.existsSync(folderName, { recursive: true })) {
            fs.mkdirSync(folderName, { recursive: true });
          }
          fs.writeFile(`${folderName}/${projekti.oid}.json`, JSON.stringify(fixed), (err: any) => {
            if (err) {
              console.error(err);
            } else {
              // done!
            }
          });
        } catch (err) {
          console.error(err);
        }
      }

      if (hasChanges) {
        if (!dryRun) {
          console.log("Päivitetään tietokantaan");
          await projektiDatabase.saveProjekti(fixed);
        } else {
          console.log("Projekti on tarve päivittää");
        }
      } else {
        console.log("Projekti on kunnossa.");
      }
      console.groupEnd();
      console.log("\n");
    }
  } while (startKey);
}
