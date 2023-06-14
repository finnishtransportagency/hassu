import * as API from "../../../../../common/graphql/apiModel";
import { isDateTimeInThePast } from "../../../util/dateUtil";
import { findJulkaisuWithTila, GenericKuulutus } from "../../projektiUtil";
import { SaameKieli, SuomiRuotsiKieli } from "../../../database/model";

/**
 *
 * @param kuulutusJulkaisut
 * @returns HYVAKSYTTY kuulutus whose kuulutusPaiva is in the past or a MIGRATOITU kuulutus
 */
export function findPublishedKuulutusJulkaisu<J extends GenericKuulutus>(kuulutusJulkaisut: J[] | undefined | null): J | undefined {
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

export function forEverySaameDo(func: (kieli: SaameKieli) => void): void {
  for (const saame in SaameKieli) {
    func(saame as SaameKieli);
  }
}
