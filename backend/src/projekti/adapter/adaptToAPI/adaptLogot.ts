import { LocalizedMap } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { fileService } from "../../../files/fileService";
import { ProjektiPaths } from "../../../files/ProjektiPath";

export function adaptLogot(oid: string, logot: LocalizedMap<string> | undefined): API.LokalisoituTeksti | undefined {
  if (logot) {
    if (!logot.SUOMI && !logot.RUOTSI) {
      throw new Error("adaptLogot: logot määrittelemättä");
    }

    return {
      __typename: "LokalisoituTeksti",
      SUOMI: logot.SUOMI ? "/" + fileService.getYllapitoPathForProjektiFile(new ProjektiPaths(oid), logot.SUOMI) : "",
      RUOTSI: logot.RUOTSI ? "/" + fileService.getYllapitoPathForProjektiFile(new ProjektiPaths(oid), logot.RUOTSI) : undefined,
    };
  }
  return logot as undefined;
}

export function adaptLogotJulkinen(oid: string, logot: LocalizedMap<string> | undefined): API.LokalisoituTeksti | undefined {
  if (logot) {
    if (!logot.SUOMI && !logot.RUOTSI) {
      throw new Error("adaptLogot: logot määrittelemättä");
    }

    return {
      __typename: "LokalisoituTeksti",
      SUOMI: logot.SUOMI ? "/" + fileService.getPublicPathForProjektiFile(new ProjektiPaths(oid), logot.SUOMI) : "",
      RUOTSI: logot.RUOTSI ? "/" + fileService.getPublicPathForProjektiFile(new ProjektiPaths(oid), logot.RUOTSI) : undefined,
    };
  }
  return logot as undefined;
}
