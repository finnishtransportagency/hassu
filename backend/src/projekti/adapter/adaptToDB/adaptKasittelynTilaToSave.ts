import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import { KasittelynTila } from "../../../database/model";
import { KasittelyntilaInput } from "../../../../../common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import isEqual from "lodash/isEqual";

export function adaptKasittelynTilaToSave(
  dbKasittelynTila: KasittelynTila | null | undefined,
  kasittelynTilaInput: KasittelyntilaInput | null | undefined,
  projektiAdaptationResult: ProjektiAdaptationResult
): KasittelynTila | undefined | null {
  if (!kasittelynTilaInput) {
    return undefined;
  }
  // Tunnista jatkopäätöksen lisäys ja lisää event käyttöoikeuksien nollaamiseksi
  if (
    dbKasittelynTila &&
    dbKasittelynTila.ensimmainenJatkopaatos === undefined &&
    kasittelynTilaInput?.ensimmainenJatkopaatos?.asianumero &&
    kasittelynTilaInput?.ensimmainenJatkopaatos?.paatoksenPvm
  ) {
    projektiAdaptationResult.resetKayttooikeudetAndSynchronizeVelho();
  }

  const newKasittelynTila: KasittelynTila = mergeWith({}, dbKasittelynTila, kasittelynTilaInput);
  if (!isEqual(dbKasittelynTila, newKasittelynTila)) {
    projektiAdaptationResult.saveProjektiToVelho();
  }
  return newKasittelynTila;
}
