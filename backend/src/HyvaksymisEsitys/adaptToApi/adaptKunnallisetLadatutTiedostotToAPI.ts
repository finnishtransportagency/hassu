import * as API from "hassu-common/graphql/apiModel";
import { KunnallinenLadattuTiedosto } from "../../database/model";
import { adaptFileName, joinPath } from "../../tiedostot/paths";

export function adaptKunnallisetLadatutTiedostotToApi({
  tiedostot,
  path,
}: {
  tiedostot: KunnallinenLadattuTiedosto[] | undefined | null;
  path: string;
}): API.KunnallinenLadattuTiedosto[] | undefined {
  if (tiedostot && tiedostot.length > 0) {
    return tiedostot.map((tiedosto: KunnallinenLadattuTiedosto) => {
      const { nimi, lisatty, uuid, kunta } = tiedosto;
      const apiAineisto: API.KunnallinenLadattuTiedosto = {
        __typename: "KunnallinenLadattuTiedosto",
        nimi,
        lisatty,
        uuid,
        kunta,
        tiedosto: joinPath(path, adaptFileName(nimi)),
      };

      return apiAineisto;
    });
  }
  return undefined;
}
