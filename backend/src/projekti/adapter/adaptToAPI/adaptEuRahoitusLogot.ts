import { EuRahoitusLogot } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { fileService } from "../../../files/fileService";
import { ProjektiPaths } from "../../../files/ProjektiPath";

export function adaptEuRahoitusLogot(
  oid: string,
  euRahoitusLogot: EuRahoitusLogot | null | undefined
): API.EuRahoitusLogot | undefined | null {
  if (euRahoitusLogot) {
    if (!euRahoitusLogot.logoFI && !euRahoitusLogot.logoSV) {
      throw new Error("adaptEuRahoitusLogot: euRahoitusLogot.logo* määrittelemättä");
    }

    return {
      __typename: "EuRahoitusLogot",
      logoFI: euRahoitusLogot.logoFI
        ? "/" + fileService.getYllapitoPathForProjektiFile(new ProjektiPaths(oid), euRahoitusLogot.logoFI)
        : null,
      logoSV: euRahoitusLogot.logoSV
        ? "/" + fileService.getYllapitoPathForProjektiFile(new ProjektiPaths(oid), euRahoitusLogot.logoSV)
        : null,
    };
  }
  return euRahoitusLogot;
}

export function adaptEuRahoitusLogotJulkinen(
  oid: string,
  euRahoitusLogot: EuRahoitusLogot | null | undefined
): API.EuRahoitusLogot | undefined | null {
  if (euRahoitusLogot) {
    if (!euRahoitusLogot.logoFI && !euRahoitusLogot.logoSV) {
      throw new Error("adaptEuRahoitusLogot: euRahoitusLogot.logo* määrittelemättä");
    }

    return {
      __typename: "EuRahoitusLogot",
      logoFI: euRahoitusLogot.logoFI
        ? "/" + fileService.getPublicPathForProjektiFile(new ProjektiPaths(oid), euRahoitusLogot.logoFI)
        : null,
      logoSV: euRahoitusLogot.logoSV
        ? "/" + fileService.getPublicPathForProjektiFile(new ProjektiPaths(oid), euRahoitusLogot.logoSV)
        : null,
    };
  }
  return euRahoitusLogot;
}
