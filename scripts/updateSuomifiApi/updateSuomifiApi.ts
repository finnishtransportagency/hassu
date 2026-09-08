// Contains code generated or recommended by Amazon Q
/**
 * Hakee Suomi.fi Messages REST API -kuvauksen tuotantoympäristöstä ja tallentaa sen
 * backend/src/suomifi/suomifiRest/suomifi-rest-messages-api.yaml tiedostoon.
 *
 * Ei muuta dataa — kirjoittaa vain YAML-tiedoston.
 *
 * Käyttö:
 *   npm run update:suomifi-api
 */

import { log } from "../../backend/src/logger";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

const URL = "https://api.messages.suomi.fi/docs/messages-api.yaml";
const OUTPUT = path.resolve(__dirname, "../../backend/src/suomifi/suomifiRest/suomifi-rest-messages-api.yaml");

async function main() {
  log.info(`Haetaan ${URL} ...`);
  const response = await axios.get<string>(URL, { responseType: "text" });
  fs.writeFileSync(OUTPUT, response.data, "utf-8");
  log.info(`Tallennettu: ${OUTPUT}`);
}

main().catch((e) => {
  log.error(e);
  process.exit(1);
});
