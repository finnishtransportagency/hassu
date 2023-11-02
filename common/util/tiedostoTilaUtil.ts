import { Aineisto } from "../../backend/src/database/model";
import * as API from "../graphql/apiModel";

export function aineistoEiOdotaPoistoaTaiPoistettu(aineisto: Aineisto | API.Aineisto): boolean {
  if (!aineisto.tila) {
    return false;
  }
  return ![API.AineistoTila.ODOTTAA_POISTOA, API.AineistoTila.POISTETTU].includes(aineisto.tila);
}
