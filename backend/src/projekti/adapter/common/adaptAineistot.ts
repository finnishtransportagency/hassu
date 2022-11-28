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
      .map((aineisto) => {
        const apiAineisto: API.Aineisto = {
          __typename: "Aineisto",
          ...aineisto,
          dokumenttiOid: aineisto.dokumenttiOid,
        };

        if (aineisto.tiedosto) {
          apiAineisto.tiedosto = fileService.getYllapitoPathForProjektiFile(paths, aineisto.tiedosto);
        }

        return apiAineisto;
      });
  }
  return undefined;
}
