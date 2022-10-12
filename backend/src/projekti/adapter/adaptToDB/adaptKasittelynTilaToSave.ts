import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import { KasittelynTila } from "../../../database/model";
import { KasittelyntilaInput } from "../../../../../common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";

export function adaptKasittelynTilaToSave(
  dbKasittelynTila: KasittelynTila | null | undefined,
  newKasittelynTila: KasittelyntilaInput | null | undefined,
  projektiAdaptationResult: ProjektiAdaptationResult
): KasittelynTila | undefined | null {
  if (!newKasittelynTila) {
    return dbKasittelynTila;
  }
  // Tunnista jatkopäätöksen lisäys ja lisää event käyttöoikeuksien nollaamiseksi
  if (
    dbKasittelynTila &&
    dbKasittelynTila.ensimmainenJatkopaatos === undefined &&
    newKasittelynTila?.ensimmainenJatkopaatos?.asianumero &&
    newKasittelynTila?.ensimmainenJatkopaatos?.paatoksenPvm
  ) {
    projektiAdaptationResult.resetKayttooikeudetAndSynchronizeVelho();
  }

  return mergeWith({}, dbKasittelynTila, newKasittelynTila);
}
