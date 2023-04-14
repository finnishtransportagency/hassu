import dayjs from "dayjs";
import * as API from "../../../common/graphql/apiModel";
import { DBProjekti, VuorovaikutusKierros, VuorovaikutusKierrosJulkaisu, NahtavillaoloVaiheJulkaisu } from "../database/model";
import { getLastVuorovaikutusDateTime } from "./vuorovaikutus";

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
  const lastVuorovaikutusTime = getLastVuorovaikutusDateTime(dbProjekti);
  if (!lastVuorovaikutusTime) return false;
  return dayjs().isAfter(lastVuorovaikutusTime);
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
