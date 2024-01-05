import { LadattuTiedosto } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../../projektiAdaptationResult";
import mergeWith from "lodash/mergeWith";

export type LausuntoPyynnotDB = LadattuTiedosto[] | undefined | null;

export function adaptTiedostotToSave(
  dbTiedostot: LadattuTiedosto[] | undefined | null,
  tiedostotInput: API.LadattuTiedostoInput[] | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): LausuntoPyynnotDB {
  const uudetTiedostot = tiedostotInput
    ?.map((inputtiedosto) => {
      const vastaavaVanhaTiedosto = dbTiedostot?.find(
        (dbtiedosto) =>
          dbtiedosto.nimi == inputtiedosto.nimi &&
          (dbtiedosto.tiedosto == inputtiedosto.tiedosto ||
            // kattaa tilanteen, jossa tiedosto on persistoitu tallennusten välillä
            (dbtiedosto.tila == API.LadattuTiedostoTila.VALMIS && inputtiedosto.tila == API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA))
      );
      return adaptTiedostoToSave(vastaavaVanhaTiedosto, inputtiedosto, projektiAdaptationResult);
    })
    .filter((tiedosto) => !(tiedosto.tila == API.LadattuTiedostoTila.ODOTTAA_POISTOA && !tiedosto.tuotu));
  return uudetTiedostot;
}

function adaptTiedostoToSave(
  dbTiedosto: LadattuTiedosto | undefined,
  tiedostoInput: API.LadattuTiedostoInput,
  projektiAdaptationResult: ProjektiAdaptationResult
): LadattuTiedosto {
  const vanhaTila = dbTiedosto?.tila;
  const uusiTila = tiedostoInput.tila;
  const vanhaTiedosto = dbTiedosto?.tiedosto;
  const uusiTiedosto = tiedostoInput.tiedosto;
  const uudessaTiedostossaOnVanhentunutTuontiTieto =
    vanhaTila == API.LadattuTiedostoTila.VALMIS && uusiTila == API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA;
  const tallennettavaTila = uudessaTiedostossaOnVanhentunutTuontiTieto ? vanhaTila : uusiTila;
  const tallennettavaTiedosto = uudessaTiedostossaOnVanhentunutTuontiTieto ? vanhaTiedosto : uusiTiedosto;

  if (!dbTiedosto || dbTiedosto.tila !== tiedostoInput.tila || dbTiedosto.tiedosto !== tiedostoInput.tiedosto) {
    projektiAdaptationResult.filesChanged();
  }
  return mergeWith({}, dbTiedosto, { ...tiedostoInput, tila: tallennettavaTila, tiedosto: tallennettavaTiedosto });
}
