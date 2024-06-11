import * as API from "hassu-common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { LadattuTiedostoNew } from "../../database/model";
import { nyt } from "../../util/dateUtil";
import { omit } from "lodash";

export function adaptLadatutTiedostotToSave<A extends LadattuTiedostoNew, B extends API.LadattuTiedostoInputNew>(
  dbTiedostot: A[] | undefined | null,
  tiedostotInput: B[] | undefined | null
): A[] | undefined | null {
  const uudetTiedostot = tiedostotInput?.map((inputtiedosto) => {
    const vastaavaVanhaTiedosto = dbTiedostot?.find((dbtiedosto) => dbtiedosto.uuid == inputtiedosto.uuid);
    return adaptLadattuTiedostoToSave<A, B>(vastaavaVanhaTiedosto, inputtiedosto);
  });
  return uudetTiedostot;
}

function adaptLadattuTiedostoToSave<A extends LadattuTiedostoNew, B extends API.LadattuTiedostoInputNew>(
  dbTiedosto: A | undefined,
  tiedostoInput: B
): A {
  return mergeWith({}, dbTiedosto, { ...omit(tiedostoInput, "tiedosto"), lisatty: dbTiedosto ? dbTiedosto.lisatty : nyt().format() });
}
