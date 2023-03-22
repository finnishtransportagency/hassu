import {
  AloitusKuulutus,
  AloitusKuulutusJulkaisu,
  DBVaylaUser,
  KuulutusSaamePDF,
  KuulutusSaamePDFt,
  LadattuTiedosto,
  RequiredLocalizedMap,
  UudelleenKuulutus,
} from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { KuulutusJulkaisuTila, LokalisoituTeksti, MuokkausTila } from "../../../../../common/graphql/apiModel";
import {
  adaptIlmoituksenVastaanottajat,
  adaptKielitiedotByAddingTypename,
  adaptLokalisoituTeksti as adaptHankkeenKuvaus,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptStandardiYhteystiedotByAddingTypename,
  adaptVelho,
} from "../common";
import { adaptSuunnitteluSopimusJulkaisu, FileLocation } from "./adaptSuunitteluSopimus";
import { fileService } from "../../../files/fileService";
import { adaptMuokkausTila, findJulkaisuWithTila } from "../../projektiUtil";
import { ProjektiPaths } from "../../../files/ProjektiPath";
import { KaannettavaKieli } from "../../../../../common/kaannettavatKielet";

export function adaptAloitusKuulutus(
  kayttoOikeudet: DBVaylaUser[],
  kuulutus?: AloitusKuulutus | null,
  aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null
): API.AloitusKuulutus | undefined {
  if (kuulutus) {
    if (!kuulutus.hankkeenKuvaus) {
      throw new Error("adaptAloituskuulutus: kuulutus.hankkeenKuvaus puuttuu");
    }
    const { kuulutusYhteystiedot, uudelleenKuulutus, id: _id, aloituskuulutusSaamePDFt, ...otherKuulutusFields } = kuulutus;
    return {
      __typename: "AloitusKuulutus",
      ...otherKuulutusFields,
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(kuulutus.ilmoituksenVastaanottajat),
      hankkeenKuvaus: adaptHankkeenKuvaus(kuulutus.hankkeenKuvaus),
      kuulutusYhteystiedot: adaptStandardiYhteystiedotByAddingTypename(kayttoOikeudet, kuulutusYhteystiedot),
      aloituskuulutusSaamePDFt: adaptKuulutusSaamePDFt(aloituskuulutusSaamePDFt),
      uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
      muokkausTila: adaptMuokkausTila(kuulutus, aloitusKuulutusJulkaisut),
    };
  } else if (findJulkaisuWithTila(aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.MIGROITU)) {
    return { __typename: "AloitusKuulutus", muokkausTila: MuokkausTila.MIGROITU };
  }
  return kuulutus as undefined;
}

function adaptLadattuTiedostoToAPI(ladattuTiedosto: LadattuTiedosto): API.LadattuTiedosto | undefined {
  if (ladattuTiedosto && ladattuTiedosto.nimi) {
    const { tiedosto, nimi, tuotu } = ladattuTiedosto;
    return { __typename: "LadattuTiedosto", tiedosto, nimi, tuotu };
  }
}

function adaptKuulutusSaamePDFt(dbPDFt: KuulutusSaamePDFt | undefined): API.KuulutusSaamePDFt | undefined {
  if (!dbPDFt) {
    return undefined;
  }
  let kieli: keyof typeof dbPDFt;
  const apiPDFt: API.KuulutusSaamePDFt = { __typename: "KuulutusSaamePDFt" };
  for (kieli in dbPDFt) {
    const kuulutusIlmoitus: KuulutusSaamePDF | undefined = dbPDFt[kieli];
    if (kuulutusIlmoitus) {
      const kuulutusIlmoitusPDFt: API.KuulutusSaamePDF = { __typename: "KuulutusSaamePDF" };
      let ladattuTiedosto = kuulutusIlmoitus.kuulutusPDF;
      if (ladattuTiedosto) {
        kuulutusIlmoitusPDFt.kuulutusPDF = adaptLadattuTiedostoToAPI(ladattuTiedosto);
      }
      ladattuTiedosto = kuulutusIlmoitus.kuulutusIlmoitusPDF;
      if (ladattuTiedosto) {
        kuulutusIlmoitusPDFt.kuulutusIlmoitusPDF = adaptLadattuTiedostoToAPI(ladattuTiedosto);
      }
      apiPDFt[kieli] = kuulutusIlmoitusPDFt;
    }
  }
  return apiPDFt;
}

export function adaptAloitusKuulutusJulkaisu(
  oid: string,
  aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null
): API.AloitusKuulutusJulkaisu | undefined {
  if (aloitusKuulutusJulkaisut) {
    const julkaisu =
      findJulkaisuWithTila(aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA) ||
      findJulkaisuWithTila(aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.HYVAKSYTTY) ||
      findJulkaisuWithTila(aloitusKuulutusJulkaisut, KuulutusJulkaisuTila.MIGROITU);
    if (julkaisu) {
      const {
        yhteystiedot,
        velho,
        suunnitteluSopimus,
        kielitiedot,
        tila,
        uudelleenKuulutus,
        aloituskuulutusSaamePDFt,
        ...fieldsToCopyAsIs
      } = julkaisu;
      if (tila == KuulutusJulkaisuTila.MIGROITU) {
        return {
          __typename: "AloitusKuulutusJulkaisu",
          tila,
          kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
          yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
          velho: adaptVelho(velho),
        };
      }
      if (!julkaisu.hankkeenKuvaus) {
        throw new Error("adaptAloitusKuulutusJulkaisut: julkaisu.hankkeenKuvaus puuttuu");
      }
      return {
        ...fieldsToCopyAsIs,
        __typename: "AloitusKuulutusJulkaisu",
        tila,
        ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(julkaisu.ilmoituksenVastaanottajat),
        hankkeenKuvaus: adaptHankkeenKuvaus(julkaisu.hankkeenKuvaus),
        yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
        velho: adaptVelho(velho),
        suunnitteluSopimus: adaptSuunnitteluSopimusJulkaisu(oid, suunnitteluSopimus, FileLocation.YLLAPITO),
        kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
        aloituskuulutusPDFt: adaptJulkaisuPDFPaths(oid, julkaisu),
        aloituskuulutusSaamePDFt: adaptKuulutusSaamePDFt(aloituskuulutusSaamePDFt),
        uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
      };
    }
  }
}

function adaptJulkaisuPDFPaths(oid: string, aloitusKuulutusJulkaisu: AloitusKuulutusJulkaisu): API.AloitusKuulutusPDFt | undefined {
  const aloitusKuulutusPDFS = aloitusKuulutusJulkaisu.aloituskuulutusPDFt;
  if (!aloitusKuulutusPDFS) {
    return undefined;
  }

  const result: Partial<API.AloitusKuulutusPDFt> = { __typename: "AloitusKuulutusPDFt" };
  for (const kieli in aloitusKuulutusPDFS) {
    const pdfs = aloitusKuulutusPDFS[kieli as API.Kieli];
    if (!pdfs) {
      result[kieli as KaannettavaKieli] = undefined;
      continue;
    }
    const aloituskuulutusPath = new ProjektiPaths(oid).aloituskuulutus(aloitusKuulutusJulkaisu);
    result[kieli as KaannettavaKieli] = {
      __typename: "AloitusKuulutusPDF",
      aloituskuulutusPDFPath: fileService.getYllapitoPathForProjektiFile(aloituskuulutusPath, pdfs.aloituskuulutusPDFPath),
      aloituskuulutusIlmoitusPDFPath: fileService.getYllapitoPathForProjektiFile(aloituskuulutusPath, pdfs.aloituskuulutusIlmoitusPDFPath),
    };
  }
  return { __typename: "AloitusKuulutusPDFt", [API.Kieli.SUOMI]: result[API.Kieli.SUOMI] as API.AloitusKuulutusPDF, ...result };
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

export function adaptLokalisoituTeksti(localizedMap: RequiredLocalizedMap<string> | undefined): LokalisoituTeksti | null | undefined {
  if (localizedMap && Object.keys(localizedMap).length > 0) {
    return {
      __typename: "LokalisoituTeksti",
      ...localizedMap,
      [API.Kieli.SUOMI]: localizedMap[API.Kieli.SUOMI] || "",
    };
  }
}
