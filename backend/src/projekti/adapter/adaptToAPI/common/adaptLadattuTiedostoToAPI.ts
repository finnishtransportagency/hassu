import { PathTuple } from "../../../../files/ProjektiPath";
import { KunnallinenLadattuTiedosto, LadattuTiedosto } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { fileService } from "../../../../files/fileService";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";

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

export function adaptLadatutTiedostotToApi(
  tiedostot: LadattuTiedosto[] | undefined | null,
  projektiPath: PathTuple
): Array<API.LadattuTiedosto> | undefined | null {
  return tiedostot
    ?.map((tiedosto) => adaptLadattuTiedostoToAPI(projektiPath, tiedosto, false) as API.LadattuTiedosto)
    .sort(jarjestaTiedostot);
}

export function adaptKunnallinenLadattuTiedostoToAPI(
  projektiPath: PathTuple,
  ladattuTiedosto: KunnallinenLadattuTiedosto,
  julkinen: boolean
): API.KunnallinenLadattuTiedosto | undefined {
  if (ladattuTiedosto && ladattuTiedosto.nimi) {
    const { tiedosto, nimi, tuotu, tila, jarjestys, uuid, kunta } = ladattuTiedosto;
    let fullPath: string = tiedosto;
    if (julkinen) {
      fullPath = fileService.getPublicPathForProjektiFile(projektiPath, tiedosto);
    } else if (ladattuTiedosto.tila === API.LadattuTiedostoTila.VALMIS) {
      fullPath = fileService.getYllapitoPathForProjektiFile(projektiPath, tiedosto);
    }
    if (!fullPath.startsWith("/")) {
      fullPath = "/" + fullPath;
    }
    return { __typename: "KunnallinenLadattuTiedosto", tiedosto: fullPath, nimi, tuotu, tila, jarjestys, uuid, kunta };
  }
}

export function adaptKunnallisetLadatutTiedostotToApi(
  tiedostot: KunnallinenLadattuTiedosto[] | undefined | null,
  projektiPath: PathTuple
): Array<API.KunnallinenLadattuTiedosto> | undefined | null {
  return tiedostot
    ?.map((tiedosto) => adaptKunnallinenLadattuTiedostoToAPI(projektiPath, tiedosto, false) as API.KunnallinenLadattuTiedosto)
    .sort(jarjestaTiedostot);
}
