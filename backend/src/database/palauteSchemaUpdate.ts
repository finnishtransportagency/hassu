import { Palaute } from "./model";

/**
 *
 * @param palaute
 */
export function migrateFromOldSchema(palaute: Record<string, any>): Palaute {
  const { otettuKasittelyyn, ...rest } = palaute;
  if (palaute.vastattu == null && otettuKasittelyyn != null) {
    const migratedPalaute = {
      ...rest,
      vastattu: otettuKasittelyyn,
    };

    return migratedPalaute as Palaute;
  }
  return palaute as Palaute;
}
