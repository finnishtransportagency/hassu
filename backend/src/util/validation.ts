import dayjs from "dayjs";
import { VuorovaikutusKierrosTila } from "../../../common/graphql/apiModel";
import { DBProjekti } from "../database/model";
import { getLastVuorovaikutusDateTime } from "./vuorovaikutus";

export function isOkToMakeNewVuorovaikutusKierros(dbProjekti: DBProjekti): boolean {
  // if time now is after time of the last vuorovaikutus, it is ok to make new VuorovaikutusKierros
  if (dbProjekti.nahtavillaoloVaiheJulkaisut?.length) {
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
  if (dbProjekti.vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.MIGROITU) {
    return true;
  }
  return true;
}
