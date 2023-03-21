import dayjs, { Dayjs } from "dayjs";
import { Aineisto } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { fileService } from "../../../files/fileService";
import { PathTuple } from "../../../files/ProjektiPath";

export function adaptAineistot(
  aineistot: Aineisto[] | undefined | null,
  paths: PathTuple,
  julkaisuPaiva?: Dayjs
): API.Aineisto[] | undefined {
  if (julkaisuPaiva && julkaisuPaiva.isAfter(dayjs())) {
    return undefined;
  }
  if (aineistot && aineistot.length > 0) {
    return aineistot
      .filter((aineisto) => aineisto.tila != API.AineistoTila.ODOTTAA_POISTOA)
      .sort((aineistoA, aineistoB) => aineistoA.nimi.localeCompare(aineistoB.nimi))
      .map((aineisto) => {
        const apiAineisto: API.Aineisto = {
          __typename: "Aineisto",
          ...aineisto,
          dokumenttiOid: aineisto.dokumenttiOid,
        };

        if (aineisto.tiedosto) {
          let tiedosto = fileService.getYllapitoPathForProjektiFile(paths, aineisto.tiedosto);
          // Enkoodaa tiedoston polku jos se ei ole jo enkoodattu
          const parts = tiedosto.split("/");
          const fileNamePart = parts[parts.length - 1];
          if (decodeURIComponent(fileNamePart) == fileNamePart) {
            parts[parts.length - 1] = encodeURIComponent(fileNamePart);
            tiedosto = parts.join("/");
          }
          apiAineisto.tiedosto = tiedosto;
        }

        return apiAineisto;
      });
  }
  return undefined;
}
