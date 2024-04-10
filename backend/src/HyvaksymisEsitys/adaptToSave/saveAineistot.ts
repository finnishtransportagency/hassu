import * as API from "hassu-common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { Aineisto } from "../../database/model";

export function saveAineistot(
  dbTiedostot: Aineisto[] | undefined | null,
  tiedostotInput: API.AineistoInput[] | undefined | null
): Aineisto[] | null | undefined {
  const uudetTiedostot = tiedostotInput?.map((inputtiedosto) => {
    const vastaavaVanhaTiedosto = dbTiedostot?.find((dbtiedosto) => dbtiedosto.uuid == inputtiedosto.uuid);
    return saveAineisto(vastaavaVanhaTiedosto, inputtiedosto);
  });
  return uudetTiedostot;
}

function saveAineisto(dbTiedosto: Aineisto | undefined, tiedostoInput: API.AineistoInput): Aineisto {
  // TODO: generoi aikaleima
  return mergeWith({}, dbTiedosto, { ...tiedostoInput });
}
