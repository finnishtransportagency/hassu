import { Dayjs } from "dayjs";
import { Aineisto } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { fileService } from "../../../../files/fileService";
import { PathTuple } from "../../../../files/ProjektiPath";
import { nyt } from "../../../../util/dateUtil";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";
import { config } from "../../../../config";

export function adaptAineistotToAPI(
  aineistot: Aineisto[] | undefined | null,
  paths: PathTuple,
  julkaisuPaiva?: Dayjs
): API.Aineisto[] | undefined {
  if (julkaisuPaiva && julkaisuPaiva.isAfter(nyt())) {
    return undefined;
  }
  if (aineistot && aineistot.length > 0) {
    return aineistot
      .filter((aineisto) => aineisto.tila != API.AineistoTila.ODOTTAA_POISTOA)
      .sort(jarjestaTiedostot)
      .map((aineisto) => {
        const { dokumenttiOid, jarjestys, kategoriaId, nimi, tuotu, tila, uuid } = aineisto;
        const apiAineisto: API.Aineisto = {
          __typename: "Aineisto",
          dokumenttiOid,
          jarjestys,
          kategoriaId,
          nimi,
          tila,
          tuotu,
          uuid,
        };

        if (aineisto.tiedosto) {
          apiAineisto.tiedosto = encodeUnencodedFilename(fileService.getYllapitoPathForProjektiFile(paths, aineisto.tiedosto));
        }

        return apiAineisto;
      });
  }
  return undefined;
}

// Enkoodaa tiedoston polku jos se ei ole jo enkoodattu
function encodeUnencodedFilename(filePath: string): string | undefined {
  const parts = filePath.split("/");
  const fileNamePart = parts.pop();
  if (fileNamePart) {
    const encodedFilename = decodeURIComponent(fileNamePart) === fileNamePart ? encodeURIComponent(fileNamePart) : fileNamePart;
    return [...parts, encodedFilename].join("/");
  }
}

export async function adaptAineistotWithSizeToAPI(
  aineistot: Aineisto[] | undefined | null,
  paths: PathTuple,
  julkaisuPaiva?: Dayjs
): Promise<API.Aineisto[] | undefined> {
  if (julkaisuPaiva && julkaisuPaiva.isAfter(nyt())) {
    return undefined;
  }
  if (aineistot && aineistot.length > 0) {
    return await Promise.all(
      aineistot
        .filter((aineisto) => aineisto.tila != API.AineistoTila.ODOTTAA_POISTOA)
        .sort(jarjestaTiedostot)
        .map(async (aineisto) => {
          const { dokumenttiOid, jarjestys, kategoriaId, nimi, tuotu, tila, uuid } = aineisto;
          const apiAineisto: API.Aineisto = {
            __typename: "Aineisto",
            dokumenttiOid,
            jarjestys,
            kategoriaId,
            nimi,
            tila,
            tuotu,
            uuid,
          };

          if (aineisto.tiedosto) {
            const filePath = fileService.getYllapitoPathForProjektiFile(paths, aineisto.tiedosto);
            apiAineisto.tiedosto = encodeUnencodedFilename(filePath);
            apiAineisto.koko = await fileService.getFileContentLength(config.yllapitoBucketName, filePath);
          }

          return apiAineisto;
        })
    );
  }
  return undefined;
}
