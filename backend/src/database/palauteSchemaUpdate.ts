import { Palaute } from "./model";
import { log } from "../logger";

/**
 * Konvertoi merkkijonomuotoiset kunnat ja maakunnat numeroiksi
 * @param palaute
 */
export function migrateFromOldSchema(palaute: Palaute): Palaute {
  const { otettuKasittelyyn } = palaute as Record<string, any>;
  const { ...rest } = palaute;

  const a = {
    ...rest,
    vastattu: otettuKasittelyyn,
  };

  log.info(a);
  return a;
}
