import { ProjektiPaths } from "../../../files/ProjektiPath";
import { LadattuTiedosto } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";

export function adaptLadattuTiedostoToAPI(projektiPath: ProjektiPaths, ladattuTiedosto: LadattuTiedosto): API.LadattuTiedosto | undefined {
  if (ladattuTiedosto && ladattuTiedosto.nimi) {
    const { tiedosto, nimi, tuotu } = ladattuTiedosto;
    return { __typename: "LadattuTiedosto", tiedosto: projektiPath.yllapitoFullPath + tiedosto, nimi, tuotu };
  }
}
