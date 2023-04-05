import dayjs from "dayjs";
import { DBProjekti } from "../database/model";
import { getLastVuorovaikutusDateTime } from "./vuorovaikutus";

export function isOkToMakeNewVuorovaikutusKierros(dbProjekti: DBProjekti): boolean {
  // if time now is after time of the last vuorovaikutus, it is ok to make new VuorovaikutusKierros
  const lastVuorovaikutusTime = getLastVuorovaikutusDateTime(dbProjekti);
  if (!lastVuorovaikutusTime) return false;
  return dayjs().isAfter(lastVuorovaikutusTime);
}
