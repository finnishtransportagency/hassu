import * as API from "hassu-common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { KunnallinenLadattuTiedosto, LadattuTiedostoNew } from "../../database/model";
import { nyt } from "../../util/dateUtil";

export function saveLadattuTiedostot<
  A extends LadattuTiedostoNew | KunnallinenLadattuTiedosto,
  B extends API.LadattuTiedostoInput | API.KunnallinenLadattuTiedostoInput
>(dbTiedostot: A[] | undefined | null, tiedostotInput: B[] | undefined | null): A[] | undefined | null {
  const uudetTiedostot = tiedostotInput?.map((inputtiedosto) => {
    const vastaavaVanhaTiedosto = dbTiedostot?.find((dbtiedosto) => dbtiedosto.uuid == inputtiedosto.uuid);
    return saveLadattuTiedosto<A, B>(vastaavaVanhaTiedosto, inputtiedosto);
  });
  return uudetTiedostot;
}

function saveLadattuTiedosto<
  A extends LadattuTiedostoNew | KunnallinenLadattuTiedosto,
  B extends API.LadattuTiedostoInput | API.KunnallinenLadattuTiedostoInput
>(dbTiedosto: A | undefined, tiedostoInput: B): A {
  if (!dbTiedosto) {
    //TODO: persistoi tiedosto
  }
  return mergeWith({}, dbTiedosto, { ...tiedostoInput, lisatty: dbTiedosto ? dbTiedosto.lisatty : nyt().format() });
}