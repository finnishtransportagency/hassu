#!/usr/bin/env node

/* eslint-disable */
// dotenv initialization must be in the beginning to load the ENV variables properly
const dotenv = require("dotenv");
dotenv.config({ path: ".env.test" });
dotenv.config({ path: ".env.local" });
/* eslint-enable */
import { importProjekti, TargetStatuses } from "../backend/src/migraatio/migration";
import AWSXRay from "aws-xray-sdk-core";
import AWS from "aws-sdk";
import readXlsxFile from "read-excel-file/node";
import yargs from "yargs";
import * as sinon from "sinon";
import { userService } from "../backend/src/user";
import { NykyinenKayttaja, Status } from "../common/graphql/apiModel";
import dayjs from "dayjs";
import tz from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";

process.env.USE_PINO_PRETTY = "true";

dayjs.extend(utc);
dayjs.extend(tz);
dayjs.extend(customParseFormat);
const TIMEZONE = "Europe/Helsinki";
dayjs.tz.setDefault(TIMEZONE);
process.env.TZ = TIMEZONE;

AWSXRay.middleware.disableCentralizedSampling();

AWS.config.region = "eu-west-1";

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
};
yargs
  .scriptName("npm run migration")
  .command(
    "import [fileName]",
    "Import projects specified in the provided xlsx file",
    (yargs) => {
      yargs.positional("fileName", {
        type: "string",
        default: "",
        describe: "Excel xlsx filename",
      });
    },
    function (argv) {
      console.log("Importing from ", argv.fileName);
      importProjektis(argv.fileName as string)
        .then(() => console.log("Finished."))
        .catch((err) => console.error(err));
    }
  )
  .demandCommand(1)
  .help().argv;

type Row = {
  oid: string;
  tila: TargetStatuses;
  hyvaksymispaatosAsianumero?: string;
  hyvaksymispaatosPaivamaara?: Date;
};

export async function importProjektis(fileName: string): Promise<Record<string, Status>> {
  const result: Record<string, Status> = {};
  sinon.stub(userService, "identifyUser").resolves();
  const kayttaja: NykyinenKayttaja = {
    __typename: "NykyinenKayttaja",
    etuNimi: "migraatio",
    sukuNimi: "migraatio",
    roolit: ["hassu_admin"],
    uid: "migraatio",
  };
  userService.identifyMockUser(kayttaja);
  const { rows, errors } = await readXlsxFile<Row>(fileName, { schema });
  if (errors.length > 0) {
    console.log(errors);
    process.exit(1);
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    console.log(row);
    const oid = row.oid;
    const targetStatus = row.tila;
    await importProjekti({
      oid,
      kayttaja,
      targetStatus,
      hyvaksymispaatosAsianumero: row.hyvaksymispaatosAsianumero,
      hyvaksymispaatosPaivamaara: row.hyvaksymispaatosPaivamaara,
    });
    result[oid] = targetStatus;
  }
  return result;
}
