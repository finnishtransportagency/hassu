#!/usr/bin/env node

/* eslint-disable */
// dotenv initialization must be in the beginning to load the ENV variables properly
process.env.HASSU_XRAY_ENABLED = "false";
const dotenv = require("dotenv");
dotenv.config({ path: ".env.test" });
dotenv.config({ path: ".env.local" });
/* eslint-enable */
import { importProjekti, Row } from "../backend/src/migraatio/migration";
import AWSXRay from "aws-xray-sdk-core";
import readXlsxFile from "read-excel-file/node";
import yargs from "yargs";
import * as sinon from "sinon";
import { userService } from "../backend/src/user";
import { NykyinenKayttaja, Status } from "../common/graphql/apiModel";
import dayjs from "dayjs";
import tz from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import { projektiDatabase } from "../backend/src/database/projektiDatabase";

process.env.USE_PINO_PRETTY = "true";

dayjs.extend(utc);
dayjs.extend(tz);
dayjs.extend(customParseFormat);
const TIMEZONE = "Europe/Helsinki";
dayjs.tz.setDefault(TIMEZONE);
process.env.TZ = TIMEZONE;
process.env.MIGRATION_CLI = "true";

AWSXRay.middleware.disableCentralizedSampling();

const schema = {
  oid: {
    prop: "oid",
    type: String,
  },
  Tila: {
    prop: "tila",
    type: String,
  },
  ["Hyväksymispäätös asianumero"]: {
    prop: "hyvaksymispaatosAsianumero",
    type: String,
  },
  ["Hyväksymispäätös päivämäärä"]: {
    prop: "hyvaksymispaatosPaivamaara",
    type: Date,
  },
  ["1. Jatkopäätös asianumero"]: {
    prop: "jatkopaatosAsianumero",
    type: String,
  },
  ["1. Jatkopäätös päivämäärä"]: {
    prop: "jatkopaatosPaivamaara",
    type: Date,
  },
};
yargs
  .scriptName("npm run migration")
  .command(
    "import <fileName> <sheet> [--overwrite]",
    "Import projects specified in the provided xlsx file",
    (yargs) => {
      yargs.option("overwrite", {
        type: "boolean",
        alias: ["ow"],
        describe: "Kirjoita olemassa olevien projektien päälle",
      });
      yargs.positional("fileName", {
        type: "string",
        describe: "Excel xlsx filename",
      });
      yargs.positional("sheet", {
        type: "number",
        describe: "Excel sheet number",
      });
    },
    function (argv) {
      const overwrite = argv.overwrite;
      const sheet = argv.sheet;
      const fileName = argv.fileName;
      console.log(`Importing from ${fileName} sheet ${sheet} overwrite:${overwrite}`);
      importProjektis(fileName as string, sheet as number, overwrite as boolean)
        .then(() => console.log("Finished."))
        .catch((err) => console.error(err));
    }
  )
  .demandCommand(1)
  .help().argv;

export async function importProjektis(fileName: string, sheetNum: number, overwrite?: boolean): Promise<Record<string, Status>> {
  const result: Record<string, Status> = {};
  sinon.stub(userService, "identifyUser").resolves();
  const kayttaja: NykyinenKayttaja = {
    __typename: "NykyinenKayttaja",
    etunimi: "migraatio",
    sukunimi: "migraatio",
    roolit: ["hassu_admin"],
    uid: "migraatio",
  };
  userService.identifyMockUser(kayttaja);
  const { rows, errors } = await readXlsxFile<Row>(fileName, { schema, sheet: sheetNum });
  if (errors.length > 0) {
    console.log(errors);
    process.exit(1);
  }
  for (let i = 0; i < rows.length; i++) {
    const rivi = rows[i];
    const oid = rivi.oid;
    const tila = rivi.tila;
    if (oid && tila) {
      if (!overwrite) {
        const existing = await projektiDatabase.loadProjektiByOid(oid);
        if (existing) {
          console.log(oid + " " + tila + " on jo olemassa");
          continue;
        }
      }
      console.log(oid + " " + tila + " luodaan");
      try {
        await importProjekti({
          rivi,
          kayttaja,
        });
        result[oid] = tila;
      } catch (e) {
        console.log(oid + " " + tila + " luonti epäonnistui", e);
      }
    }
  }
  return result;
}
