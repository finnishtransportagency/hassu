import { Aineisto, LadattuTiedosto } from "../../backend/src/database/model";
import * as API from "../graphql/apiModel";

export function aineistoEiOdotaPoistoaTaiPoistettu(aineisto: Aineisto | API.Aineisto): boolean {
  if (!aineisto.tila) {
    return false;
  }
  return ![API.AineistoTila.ODOTTAA_POISTOA, API.AineistoTila.POISTETTU].includes(aineisto.tila);
}

export function ladattuTiedostoEiOdotaPoistoaTaiPoistettu(tiedosto: LadattuTiedosto | API.LadattuTiedosto): boolean {
  if (!tiedosto.tila) {
    return false;
  }
  return ![API.LadattuTiedostoTila.ODOTTAA_POISTOA, API.LadattuTiedostoTila.POISTETTU].includes(tiedosto.tila);
}

export function ladattuTiedostoTilaEiPoistettu(tila: API.LadattuTiedostoTila | undefined | null): boolean {
  if (!tila) return false;
  return [API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA, API.LadattuTiedostoTila.VALMIS].includes(tila);
}
