import * as API from "hassu-common/graphql/apiModel";
import { LadattuTiedostoNew } from "../../database/model";
import { adaptFileName, joinPath } from "../../tiedostot/paths";

export function adaptLadatutTiedostotToApi({
  tiedostot,
  path,
}: {
  tiedostot: LadattuTiedostoNew[] | undefined | null;
  path: string;
}): API.LadattuTiedostoNew[] | undefined {
  if (tiedostot && tiedostot.length > 0) {
    return [...tiedostot].map((tiedosto: LadattuTiedostoNew) => {
      const { nimi, lisatty, uuid } = tiedosto;
      const apiAineisto: API.LadattuTiedostoNew = {
        __typename: "LadattuTiedostoNew",
        nimi,
        lisatty,
        uuid,
        tiedosto: joinPath(path, adaptFileName(nimi)),
      };

      return apiAineisto;
    });
  }
  return undefined;
}
