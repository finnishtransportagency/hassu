import * as API from "../../../../../common/graphql/apiModel";
import { isDateTimeInThePast } from "../../../util/dateUtil";
import { findJulkaisuWithTila, GenericKuulutus } from "../../projektiUtil";

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
