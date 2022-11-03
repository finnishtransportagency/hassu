import { AloitusKuulutus, AloitusKuulutusJulkaisu, AloitusKuulutusPDF, LocalizedMap } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { AloitusKuulutusTila } from "../../../../../common/graphql/apiModel";
import {
  adaptHankkeenKuvaus,
  adaptIlmoituksenVastaanottajat,
  adaptKielitiedotByAddingTypename,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptStandardiYhteystiedotByAddingTypename,
  adaptVelho,
} from "../common";
import { adaptSuunnitteluSopimusJulkaisu, FileLocation } from "./adaptSuunitteluSopimus";
import { fileService } from "../../../files/fileService";

export function adaptAloitusKuulutus(kuulutus?: AloitusKuulutus | null): API.AloitusKuulutus | undefined {
  if (kuulutus) {
    if (!kuulutus.hankkeenKuvaus) {
      throw new Error("adaptAloituskuulutus: kuulutus.hankkeenKuvaus puuttuu");
    }
    const { kuulutusYhteystiedot, ...otherKuulutusFields } = kuulutus;
    return {
      __typename: "AloitusKuulutus",
      ...otherKuulutusFields,
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(kuulutus.ilmoituksenVastaanottajat),
      hankkeenKuvaus: adaptHankkeenKuvaus(kuulutus.hankkeenKuvaus),
      kuulutusYhteystiedot: adaptStandardiYhteystiedotByAddingTypename(kuulutusYhteystiedot),
    };
  }
  return kuulutus as undefined;
}

export function adaptAloitusKuulutusJulkaisut(
  oid: string,
  aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null
): API.AloitusKuulutusJulkaisu[] | undefined {
  if (aloitusKuulutusJulkaisut) {
    return aloitusKuulutusJulkaisut.map((julkaisu) => {
      const { yhteystiedot, velho, suunnitteluSopimus, kielitiedot, tila, ...fieldsToCopyAsIs } = julkaisu;
      if (tila == AloitusKuulutusTila.MIGROITU) {
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
      const apiJulkaisu: API.AloitusKuulutusJulkaisu = {
        ...fieldsToCopyAsIs,
        __typename: "AloitusKuulutusJulkaisu",
        tila,
        ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(julkaisu.ilmoituksenVastaanottajat),
        hankkeenKuvaus: adaptHankkeenKuvaus(julkaisu.hankkeenKuvaus),
        yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
        velho: adaptVelho(velho),
        suunnitteluSopimus: adaptSuunnitteluSopimusJulkaisu(oid, suunnitteluSopimus, FileLocation.YLLAPITO),
        kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
        aloituskuulutusPDFt: adaptJulkaisuPDFPaths(oid, julkaisu.aloituskuulutusPDFt),
      };
      return apiJulkaisu;
    });
  }
  return undefined;
}

function adaptJulkaisuPDFPaths(
  oid: string,
  aloitusKuulutusPDFS: LocalizedMap<AloitusKuulutusPDF> | null | undefined
): API.AloitusKuulutusPDFt | undefined {
  if (!aloitusKuulutusPDFS) {
    return undefined;
  }

  const result: Partial<API.AloitusKuulutusPDFt> = { __typename: "AloitusKuulutusPDFt" };
  for (const kieli in aloitusKuulutusPDFS) {
    const pdfs = aloitusKuulutusPDFS[kieli as API.Kieli];
    if (!pdfs) {
      result[kieli as API.Kieli] = undefined;
      continue;
    }
    const aloitusKuulutusPdf: API.AloitusKuulutusPDF = {
      __typename: "AloitusKuulutusPDF",
      // getYllapitoPathForProjektiFile molemmat argumentit on määritelty, joten funktio palauttaa ei-undefined arvon
      // aloitusKuulutusPDFS[kieli].aloituskuulutusPDFPath on määritelty tässä vaiheessa
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      aloituskuulutusPDFPath: fileService.getYllapitoPathForProjektiFile(oid, pdfs.aloituskuulutusPDFPath),
      // getYllapitoPathForProjektiFile molemmat argumentit on määritelty, joten funktio palauttaa ei-undefined arvon
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      aloituskuulutusIlmoitusPDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        // aloitusKuulutusPDFS[kieli].aloituskuulutusIlmoitusPDFPath on määritelty tässä vaiheessa
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        pdfs.aloituskuulutusIlmoitusPDFPath
      ),
    };
    result[kieli as API.Kieli] = aloitusKuulutusPdf;
  }
  return { __typename: "AloitusKuulutusPDFt", [API.Kieli.SUOMI]: result[API.Kieli.SUOMI] as API.AloitusKuulutusPDF, ...result };
}
