import { PathTuple } from "../../../../files/ProjektiPath";
import { LadattuTiedosto } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { fileService } from "../../../../files/fileService";

export function adaptLadattuTiedostoToAPI(
  projektiPath: PathTuple,
  ladattuTiedosto: LadattuTiedosto,
  julkinen: boolean
): API.LadattuTiedosto | undefined {
  if (ladattuTiedosto && ladattuTiedosto.nimi) {
    const { tiedosto, nimi, tuotu, tila, jarjestys, uuid } = ladattuTiedosto;
    let fullPath: string = tiedosto;
    if (julkinen) {
      fullPath = fileService.getPublicPathForProjektiFile(projektiPath, tiedosto);
    } else if (ladattuTiedosto.tila === API.LadattuTiedostoTila.VALMIS) {
      fullPath = fileService.getYllapitoPathForProjektiFile(projektiPath, tiedosto);
    }
    if (!fullPath.startsWith("/")) {
      fullPath = "/" + fullPath;
    }
    return { __typename: "LadattuTiedosto", tiedosto: fullPath, nimi, tuotu, tila, jarjestys, uuid };
  }
}
