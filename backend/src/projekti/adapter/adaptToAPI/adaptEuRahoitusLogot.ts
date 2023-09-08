import { LocalizedMap } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { fileService } from "../../../files/fileService";
import { ProjektiPaths } from "../../../files/ProjektiPath";

export function adaptEuRahoitusLogot(
  oid: string,
  euRahoitusLogot: LocalizedMap<string> | null | undefined
): API.LokalisoituTeksti | undefined | null {
  if (euRahoitusLogot) {
    if (!euRahoitusLogot.SUOMI && !euRahoitusLogot.RUOTSI) {
      throw new Error("adaptEuRahoitusLogot: euRahoitusLogot.logo* määrittelemättä");
    }

    return {
      __typename: "LokalisoituTeksti",
      SUOMI: euRahoitusLogot.SUOMI ? "/" + fileService.getYllapitoPathForProjektiFile(new ProjektiPaths(oid), euRahoitusLogot.SUOMI) : "",
      RUOTSI: euRahoitusLogot.RUOTSI
        ? "/" + fileService.getYllapitoPathForProjektiFile(new ProjektiPaths(oid), euRahoitusLogot.RUOTSI)
        : null,
    };
  }
  return euRahoitusLogot;
}

export function adaptEuRahoitusLogotJulkinen(
  oid: string,
  euRahoitusLogot: LocalizedMap<string> | null | undefined
): API.LokalisoituTeksti | undefined | null {
  if (euRahoitusLogot) {
    if (!euRahoitusLogot.SUOMI && !euRahoitusLogot.RUOTSI) {
      throw new Error("adaptEuRahoitusLogot: euRahoitusLogot.logo* määrittelemättä");
    }

    return {
      __typename: "LokalisoituTeksti",
      SUOMI: euRahoitusLogot.SUOMI ? "/" + fileService.getPublicPathForProjektiFile(new ProjektiPaths(oid), euRahoitusLogot.SUOMI) : "",
      RUOTSI: euRahoitusLogot.RUOTSI
        ? "/" + fileService.getPublicPathForProjektiFile(new ProjektiPaths(oid), euRahoitusLogot.RUOTSI)
        : null,
    };
  }
  return euRahoitusLogot;
}
