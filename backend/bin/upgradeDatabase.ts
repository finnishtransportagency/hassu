/* tslint:disable:no-console */
import cloneDeep from "lodash/cloneDeep";
import { DBProjekti } from "../src/database/model";
import yargs from "yargs";
import { TestProjektiDatabase } from "../src/database/testProjektiDatabase";

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
      let fixed: DBProjekti = cloneDeep(projekti);
      console.group("Projekti " + fixed.oid);
      let hasChanges = false;
      let vuorovaikutusKierros = fixed.vuorovaikutusKierros;
      if (vuorovaikutusKierros) {
        if (vuorovaikutusKierros.vuorovaikutusNumero === 0) {
          console.log("Korjataan vuorovaikutusKierros.vuorovaikutusNumero:ksi 1");
          vuorovaikutusKierros.vuorovaikutusNumero = 1;
          hasChanges = true;
        }
        if (JSON.stringify(vuorovaikutusKierros).includes("/0_")) {
          console.error("Varoitus: vuorovaikutuskierroksesta löytyi epäilyttävä tiedostopolku!", { vuorovaikutusKierros });
        }
      }
      fixed.vuorovaikutusKierrosJulkaisut?.map((julkaisu) => {
        if (julkaisu.id === 0) {
          console.log("Korjataan vuorovaikutusKierrosJulkaisut.julkaisu.id:ksi 1");
          julkaisu.id = 1;
          hasChanges = true;
        }
        if (JSON.stringify(julkaisu).includes("/0_")) {
          console.error("Varoitus: vuorovaikutuskierrosjulkaisusta löytyi epäilyttävä tiedostopolku!", { julkaisu });
        }
      });

      if (hasChanges) {
        if (!dryRun) {
          console.log("Päivitetään tietokantaan");
          await projektiDatabase.saveProjekti(fixed);
        }
      } else {
        console.log("Projekti on kunnossa.");
      }
      console.groupEnd();
      console.log("\n");
    }
  } while (startKey);
}
