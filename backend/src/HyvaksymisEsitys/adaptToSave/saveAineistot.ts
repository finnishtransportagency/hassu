import * as API from "hassu-common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { AineistoNew } from "../../database/model";
import { nyt } from "../../util/dateUtil";

export function saveAineistot(
  dbTiedostot: AineistoNew[] | undefined | null,
  tiedostotInput: API.AineistoInputNew[] | undefined | null
): AineistoNew[] | null | undefined {
  const uudetTiedostot = tiedostotInput?.map((inputtiedosto) => {
    const vastaavaVanhaTiedosto = dbTiedostot?.find((dbtiedosto) => dbtiedosto.uuid == inputtiedosto.uuid);
    return saveAineisto(vastaavaVanhaTiedosto, inputtiedosto);
  });
  return uudetTiedostot;
}

function saveAineisto(dbTiedosto: AineistoNew | undefined, tiedostoInput: API.AineistoInputNew): AineistoNew {
  return mergeWith({}, dbTiedosto, { ...tiedostoInput, lisatty: dbTiedosto ? dbTiedosto.lisatty : nyt().format() });
}
