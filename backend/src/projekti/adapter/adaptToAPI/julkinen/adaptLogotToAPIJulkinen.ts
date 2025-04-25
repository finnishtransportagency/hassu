import { ProjektiPaths } from "../../../../files/ProjektiPath";
import { LocalizedMap } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { fileService } from "../../../../files/fileService";

export function adaptLogotToAPIJulkinen(oid: string, logot: LocalizedMap<string> | undefined): API.LokalisoituTeksti | undefined {
  if (logot) {
    if (!logot.SUOMI && !logot.RUOTSI) {
      return undefined;
    }

    return {
      __typename: "LokalisoituTeksti",
      SUOMI: logot.SUOMI ? "/" + fileService.getPublicPathForProjektiFile(new ProjektiPaths(oid), logot.SUOMI) : "",
      RUOTSI: logot.RUOTSI ? "/" + fileService.getPublicPathForProjektiFile(new ProjektiPaths(oid), logot.RUOTSI) : undefined,
    };
  }
  return logot as undefined;
}
