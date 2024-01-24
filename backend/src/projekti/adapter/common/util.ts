import * as API from "hassu-common/graphql/apiModel";
import { isDateTimeInThePast, nyt } from "../../../util/dateUtil";
import { findJulkaisuWithTila, GenericDbKuulutusJulkaisu } from "../../projektiUtil";
import { SaameKieli, SuomiRuotsiKieli } from "../../../database/model";
import dayjs from "dayjs";

/**
 *
 * @param kuulutusJulkaisut
 * @returns HYVAKSYTTY kuulutus whose kuulutusPaiva is in the past or a MIGRATOITU kuulutus
 */
export function findPublishedKuulutusJulkaisu<J extends GenericDbKuulutusJulkaisu>(
  kuulutusJulkaisut: J[] | undefined | null
): J | undefined {
  const hyvaksyttyKuulutus = findJulkaisuWithTila(kuulutusJulkaisut, API.KuulutusJulkaisuTila.HYVAKSYTTY);
  if (hyvaksyttyKuulutus?.kuulutusPaiva && isDateTimeInThePast(hyvaksyttyKuulutus.kuulutusPaiva, "start-of-day")) {
    return hyvaksyttyKuulutus;
  }
  return findJulkaisuWithTila(kuulutusJulkaisut, API.KuulutusJulkaisuTila.MIGROITU);
}

export function forSuomiRuotsiDo(func: (kieli: SuomiRuotsiKieli) => void): void {
  for (const kieli in SuomiRuotsiKieli) {
    func(kieli as SuomiRuotsiKieli);
  }
}

export async function forSuomiRuotsiDoAsync(func: (kieli: SuomiRuotsiKieli) => Promise<void>): Promise<void> {
  for (const kieli in SuomiRuotsiKieli) {
    await func(kieli as SuomiRuotsiKieli);
  }
}

export function forEverySaameDo(func: (kieli: SaameKieli) => void): void {
  for (const saame in SaameKieli) {
    func(saame as SaameKieli);
  }
}

export function isUnsetOrInPast(julkaisuPaiva?: dayjs.Dayjs) {
  return !julkaisuPaiva || julkaisuPaiva.isBefore(nyt());
}
