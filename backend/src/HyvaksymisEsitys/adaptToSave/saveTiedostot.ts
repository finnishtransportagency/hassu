import * as API from "hassu-common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { LadattuTiedosto } from "../../database/model";
import { nyt } from "../../util/dateUtil";

export function saveTiedostot(
  dbTiedostot: LadattuTiedosto[] | undefined | null,
  tiedostotInput: API.LadattuTiedostoInput[] | undefined | null
): LadattuTiedosto[] | undefined | null {
  const uudetTiedostot = tiedostotInput?.map((inputtiedosto) => {
    const vastaavaVanhaTiedosto = dbTiedostot?.find((dbtiedosto) => dbtiedosto.uuid == inputtiedosto.uuid);
    return saveTiedosto(vastaavaVanhaTiedosto, inputtiedosto);
  });
  return uudetTiedostot;
}

function saveTiedosto(dbTiedosto: LadattuTiedosto | undefined, tiedostoInput: API.LadattuTiedostoInput): LadattuTiedosto {
  let tuotu = dbTiedosto?.tuotu;
  if (!dbTiedosto) {
    //TODO: persistoi tiedosto
    tuotu = nyt().format();
  }
  return mergeWith({}, dbTiedosto, { ...tiedostoInput, tuotu });
}
