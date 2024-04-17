import * as API from "hassu-common/graphql/apiModel";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";
import { KunnallinenLadattuTiedosto } from "../../database/model";
import { joinPath } from "../paths";

export function adaptKunnallisetLadatutTiedostotToApi({
  tiedostot,
  path,
}: {
  tiedostot: KunnallinenLadattuTiedosto[] | undefined | null;
  path: string;
}): API.KunnallinenLadattuTiedosto[] | undefined {
  if (tiedostot && tiedostot.length > 0) {
    return tiedostot.sort(jarjestaTiedostot).map((tiedosto: KunnallinenLadattuTiedosto) => {
      const { jarjestys, nimi, lisatty, uuid, kunta } = tiedosto;
      const apiAineisto: API.KunnallinenLadattuTiedosto = {
        __typename: "KunnallinenLadattuTiedosto",
        jarjestys,
        nimi,
        lisatty,
        uuid,
        kunta,
        tiedosto: joinPath(path, nimi),
      };

      return apiAineisto;
    });
  }
  return undefined;
}
