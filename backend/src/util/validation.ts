import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti, NahtavillaoloVaiheJulkaisu, VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu } from "../database/model";
import { getLastJulkaistuVuorovaikutusDateTime, ProjektiVuorovaikutuksilla } from "./vuorovaikutus";
import { nyt } from "./dateUtil";

export function isOkToMakeNewVuorovaikutusKierros(dbProjekti: {
  nahtavillaoloVaiheJulkaisut?: NahtavillaoloVaiheJulkaisu[] | null | undefined | true;
  vuorovaikutusKierros?: VuorovaikutusKierros | null | undefined;
  vuorovaikutusKierrosJulkaisut?: VuorovaikutusKierrosJulkaisu[] | null | undefined;
}): boolean {
  // if time now is after time of the last vuorovaikutus, it is ok to make new VuorovaikutusKierros
  if (dbProjekti.nahtavillaoloVaiheJulkaisut !== true && dbProjekti.nahtavillaoloVaiheJulkaisut?.length) {
    return false;
  }
  if (!dbProjekti.vuorovaikutusKierros) {
    return false;
  }
  if (dbProjekti.vuorovaikutusKierros.tila == API.VuorovaikutusKierrosTila.MUOKATTAVISSA) {
    return false;
  }
  const lastVuorovaikutusTime = getLastJulkaistuVuorovaikutusDateTime(dbProjekti as ProjektiVuorovaikutuksilla);
  if (!lastVuorovaikutusTime) {
    return true;
  }
  return nyt().isAfter(lastVuorovaikutusTime);
}

export function isOkToSendNahtavillaoloToApproval(dbProjekti: DBProjekti): boolean {
  const muokattavanaOlevaKierros = dbProjekti.vuorovaikutusKierros?.vuorovaikutusNumero;
  const viimeisinJulkaistuKierros = dbProjekti.vuorovaikutusKierrosJulkaisut?.[dbProjekti.vuorovaikutusKierrosJulkaisut.length - 1].id;
  if (
    muokattavanaOlevaKierros !== undefined &&
    viimeisinJulkaistuKierros !== undefined &&
    muokattavanaOlevaKierros > viimeisinJulkaistuKierros
  ) {
    return false;
  }
  if (dbProjekti.vuorovaikutusKierros?.tila === API.VuorovaikutusKierrosTila.MIGROITU) {
    return true;
  }
  return true;
}
