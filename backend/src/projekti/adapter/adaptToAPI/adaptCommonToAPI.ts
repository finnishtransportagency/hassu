import { PathTuple, ProjektiPaths } from "../../../files/ProjektiPath";
import {
  AineistoMuokkaus,
  KuulutusSaamePDF,
  KuulutusSaamePDFt,
  LadattuTiedosto,
  LocalizedMap,
  RequiredLocalizedMap,
  UudelleenKuulutus,
} from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { forEverySaameDo } from "../common";
import { fileService } from "../../../files/fileService";

export function adaptKuulutusSaamePDFt(
  projektiPath: PathTuple,
  dbPDFt: KuulutusSaamePDFt | undefined,
  julkinen: boolean
): API.KuulutusSaamePDFt | undefined {
  if (!dbPDFt) {
    return undefined;
  }
  const apiPDFt: API.KuulutusSaamePDFt = { __typename: "KuulutusSaamePDFt" };
  forEverySaameDo((kieli) => {
    const kuulutusIlmoitus: KuulutusSaamePDF | undefined = dbPDFt[kieli];
    if (kuulutusIlmoitus) {
      const kuulutusIlmoitusPDFt: API.KuulutusSaamePDF = { __typename: "KuulutusSaamePDF" };
      let ladattuTiedosto = kuulutusIlmoitus.kuulutusPDF;
      if (ladattuTiedosto) {
        kuulutusIlmoitusPDFt.kuulutusPDF = adaptLadattuTiedostoToAPI(projektiPath, ladattuTiedosto, julkinen);
      }
      ladattuTiedosto = kuulutusIlmoitus.kuulutusIlmoitusPDF;
      if (ladattuTiedosto) {
        kuulutusIlmoitusPDFt.kuulutusIlmoitusPDF = adaptLadattuTiedostoToAPI(projektiPath, ladattuTiedosto, julkinen);
      }
      apiPDFt[kieli] = kuulutusIlmoitusPDFt;
    }
  });
  return apiPDFt;
}

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

export function adaptUudelleenKuulutus(uudelleenKuulutus: UudelleenKuulutus | null | undefined): API.UudelleenKuulutus | null | undefined {
  if (!uudelleenKuulutus) {
    return uudelleenKuulutus;
  }
  return {
    __typename: "UudelleenKuulutus",
    tila: uudelleenKuulutus.tila,
    alkuperainenHyvaksymisPaiva: uudelleenKuulutus.alkuperainenHyvaksymisPaiva,
    selosteKuulutukselle: adaptLokalisoituTeksti(uudelleenKuulutus.selosteKuulutukselle),
    selosteLahetekirjeeseen: adaptLokalisoituTeksti(uudelleenKuulutus.selosteLahetekirjeeseen),
  };
}

export function adaptLokalisoituTeksti(localizedMap: RequiredLocalizedMap<string> | undefined): API.LokalisoituTeksti | null | undefined {
  if (localizedMap && Object.keys(localizedMap).length > 0) {
    return {
      __typename: "LokalisoituTeksti",
      ...localizedMap,
      [API.Kieli.SUOMI]: localizedMap[API.Kieli.SUOMI] || "",
    };
  }
}

export function adaptAineistoMuokkaus(aineistoMuokkaus: AineistoMuokkaus | null | undefined): API.AineistoMuokkaus | null | undefined {
  if (!aineistoMuokkaus) {
    return aineistoMuokkaus;
  }
  return {
    __typename: "AineistoMuokkaus",
    alkuperainenHyvaksymisPaiva: aineistoMuokkaus.alkuperainenHyvaksymisPaiva,
  };
}

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
