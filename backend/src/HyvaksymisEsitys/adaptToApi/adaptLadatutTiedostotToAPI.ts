import * as API from "hassu-common/graphql/apiModel";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";
import { LadattuTiedostoNew } from "../../database/model";

export function adaptLadatutTiedostotToApi({
  tiedostot,
  path,
}: {
  tiedostot: LadattuTiedostoNew[] | undefined | null;
  path: string;
}): API.LadattuTiedostoNew[] | undefined {
  if (tiedostot && tiedostot.length > 0) {
    return tiedostot.sort(jarjestaTiedostot).map((tiedosto: LadattuTiedostoNew) => {
      const { jarjestys, nimi, lisatty, uuid } = tiedosto;
      const apiAineisto: API.LadattuTiedostoNew = {
        __typename: "LadattuTiedostoNew",
        jarjestys,
        nimi,
        lisatty,
        uuid,
        tiedosto: path + nimi,
      };

      return apiAineisto;
    });
  }
  return undefined;
}