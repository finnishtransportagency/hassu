#!/usr/bin/env node

// This code must be in the beginning to load the ENV variables properly
let dotenv = require("dotenv");
dotenv.config({ path: ".env.test" });
dotenv.config({ path: ".env.local" });

import { AloitusKuulutusJulkaisu } from "../backend/src/database/model/projekti";
import { asiakirjaAdapter } from "../backend/src/handler/asiakirjaAdapter";
import { calculateEndDate } from "../backend/src/endDateCalculator/endDateCalculatorHandler";
import { projektiDatabase } from "../backend/src/database/projektiDatabase";
import { log } from "../backend/src/logger";
import AWSXRay from "aws-xray-sdk-core";
import AWS from "aws-sdk";
import readXlsxFile from "read-excel-file/node";
import yargs from "yargs";
import * as sinon from "sinon";
import { userService } from "../backend/src/user";
import { createProjektiFromVelho } from "../backend/src/handler/projektiHandler";
import { AloitusKuulutusTila, Kieli, LaskuriTyyppi, NykyinenKayttaja } from "../common/graphql/apiModel";
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
  Aloituskuulutus: {
    prop: "aloituskuulutus",
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
  aloituskuulutus: string;
};

async function importProjektis(fileName: string) {
  sinon.stub(userService, "identifyUser").resolves();
  const kayttaja: NykyinenKayttaja = {
    __typename: "NykyinenKayttaja",
    etuNimi: "migraatio",
    sukuNimi: "migraatio",
    roolit: ["hassu_admin"],
    uid: "migraatio",
  };
  userService.identifyMockUser(kayttaja);
  let { rows, errors } = await readXlsxFile<Row>(fileName, { schema });
  if (errors.length > 0) {
    console.log(errors);
    process.exit(1);
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let oid = row.oid;
    const projekti = await createProjektiFromVelho(oid, kayttaja);
    projekti.kielitiedot = { ensisijainenKieli: Kieli.SUOMI };
    projekti.liittyvatSuunnitelmat = null;
    projekti.suunnitteluSopimus = null;

    if (row.aloituskuulutus) {
      let kuulutusPaiva = dayjs.utc(row.aloituskuulutus).tz(TIMEZONE, true);
      const siirtyySuunnitteluVaiheeseen = await calculateEndDate({
        alkupaiva: kuulutusPaiva.format("YYYY-MM-DDTHH:mm"),
        tyyppi: LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA,
      });
      projekti.aloitusKuulutus = {
        kuulutusPaiva: kuulutusPaiva.format("YYYY-MM-DDTHH:mm"),
        siirtyySuunnitteluVaiheeseen,
      };
      projekti.aloitusKuulutus.hankkeenKuvaus = { SUOMI: "" };
    }

    log.info("Creating projekti to Hassu", { projekti });
    await projektiDatabase.createProjekti(projekti);
    log.info("Created projekti to Hassu");

    if (row.aloituskuulutus) {
      const aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu =
        asiakirjaAdapter.migrateAloitusKuulutusJulkaisu(projekti);
      aloitusKuulutusJulkaisu.tila = AloitusKuulutusTila.MIGROITU;
      aloitusKuulutusJulkaisu.muokkaaja = kayttaja.uid;
      await projektiDatabase.insertAloitusKuulutusJulkaisu(projekti.oid, aloitusKuulutusJulkaisu);
    }
  }
}
