import { Palaute } from "./model";

/**
 *
 * @param palaute
 */
export function migrateFromOldSchema(palaute: Palaute): Palaute {
  const { otettuKasittelyyn } = palaute as Record<string, any>;
  if (palaute.vastattu == null && otettuKasittelyyn != null) {
    const migratedPalaute = {
      ...palaute,
      vastattu: otettuKasittelyyn,
    };

    return migratedPalaute;
  }
  return palaute;
}
