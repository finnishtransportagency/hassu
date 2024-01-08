import { LadattuTiedosto } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../../projektiAdaptationResult";
import mergeWith from "lodash/mergeWith";
import { log } from "../../../../logger";

export type LausuntoPyynnotDB = LadattuTiedosto[] | undefined | null;

export function adaptTiedostotToSave(
  dbTiedostot: LadattuTiedosto[] | undefined | null,
  tiedostotInput: API.LadattuTiedostoInput[] | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): LausuntoPyynnotDB {
  log.info("dbTiedostot", dbTiedostot);
  const uudetTiedostot = tiedostotInput
    ?.map((inputtiedosto) => {
      const vastaavaVanhaTiedosto = dbTiedostot?.find((dbtiedosto) => dbtiedosto.uuid == inputtiedosto.uuid);
      return adaptTiedostoToSave(vastaavaVanhaTiedosto, inputtiedosto, projektiAdaptationResult);
    })
    .filter((tiedosto) => !(tiedosto.tila == API.LadattuTiedostoTila.ODOTTAA_POISTOA && !tiedosto.tuotu));
  log.info("uudetTiedostot", uudetTiedostot);
  return uudetTiedostot;
}

function adaptTiedostoToSave(
  dbTiedosto: LadattuTiedosto | undefined,
  tiedostoInput: API.LadattuTiedostoInput,
  projektiAdaptationResult: ProjektiAdaptationResult
): LadattuTiedosto {
  if (!dbTiedosto || dbTiedosto.tila !== tiedostoInput.tila) {
    projektiAdaptationResult.filesChanged();
  }
  const preventTiedostoOverWrite = dbTiedosto?.tila == API.LadattuTiedostoTila.VALMIS;
  const tiedosto = preventTiedostoOverWrite ? dbTiedosto?.tiedosto : tiedostoInput.tiedosto;
  const preventTilaOverWrite =
    dbTiedosto?.tila == API.LadattuTiedostoTila.VALMIS && tiedostoInput.tila == API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA;
  const tila = preventTilaOverWrite ? API.LadattuTiedostoTila.VALMIS : tiedostoInput.tila;
  return mergeWith({}, dbTiedosto, { ...tiedostoInput, tiedosto, tila });
}
