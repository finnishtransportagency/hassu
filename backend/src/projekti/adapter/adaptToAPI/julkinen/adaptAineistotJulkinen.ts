import * as API from "hassu-common/graphql/apiModel";
import { Aineisto } from "../../../../database/model";
import { PathTuple } from "../../../../files/ProjektiPath";
import { Dayjs } from "dayjs";
import { isUnsetOrInPast } from "../../common";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";
import { fileService } from "../../../../files/fileService";

/**
 *
 * @param aineistot
 * @param paths
 * @param julkaisuPaiva Jos ei asetettu, aineistolla ei ole ajastettua julkaisua, joten se on aina julkista
 */
export function adaptAineistotJulkinen(
  aineistot: Aineisto[] | null | undefined,
  paths: PathTuple,
  julkaisuPaiva?: Dayjs
): API.Aineisto[] | undefined {
  if (isUnsetOrInPast(julkaisuPaiva) && aineistot && aineistot.length > 0) {
    return aineistot
      .filter((aineisto) => aineisto.tila == API.AineistoTila.VALMIS && aineisto.tiedosto)
      .sort(jarjestaTiedostot)
      .map((aineisto) => {
        if (!aineisto.tiedosto) {
          throw new Error("adaptAineistotJulkinen: aineisto.tiedosto määrittelemättä");
        }
        const { nimi, dokumenttiOid, jarjestys, kategoriaId, tuotu, uuid } = aineisto;
        let tiedosto = fileService.getPublicPathForProjektiFile(paths, aineisto.tiedosto);
        // Enkoodaa tiedoston polku jos se ei ole jo enkoodattu
        const parts = tiedosto.split("/");
        const fileNamePart = parts[parts.length - 1];
        if (decodeURIComponent(fileNamePart) == fileNamePart) {
          parts[parts.length - 1] = encodeURIComponent(fileNamePart);
          tiedosto = parts.join("/");
        }

        return {
          __typename: "Aineisto",
          dokumenttiOid,
          tiedosto,
          nimi,
          jarjestys,
          kategoriaId,
          tuotu,
          tila: API.AineistoTila.VALMIS,
          uuid,
        };
      });
  }
  return undefined;
}
