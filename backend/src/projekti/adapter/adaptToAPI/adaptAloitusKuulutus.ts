import { AloitusKuulutus, AloitusKuulutusJulkaisu, AloitusKuulutusPDF, LocalizedMap } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import {
  adaptHankkeenKuvaus,
  adaptIlmoituksenVastaanottajat,
  adaptKielitiedotByAddingTypename,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptStandardiYhteystiedotByAddingTypename,
  adaptVelhoByAddingTypename,
} from "../common";
import { adaptSuunnitteluSopimusJulkaisu } from "./adaptSuunitteluSopimus";
import { fileService } from "../../../files/fileService";

export function adaptAloitusKuulutus(kuulutus?: AloitusKuulutus | null): API.AloitusKuulutus | undefined {
  if (kuulutus) {
    if (!kuulutus.hankkeenKuvaus) {
      throw new Error("adaptAloituskuulutus: kuulutus.hankkeenKuvaus puuttuu");
    }
    if (!kuulutus.ilmoituksenVastaanottajat) {
      throw new Error("adaptAloituskuulutus: kuulutus.ilmoituksenVastaanottajat puuttuu");
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
      const { yhteystiedot, velho, suunnitteluSopimus, kielitiedot, ...fieldsToCopyAsIs } = julkaisu;
      if (!julkaisu.hankkeenKuvaus) {
        throw new Error("adaptAloitusKuulutusJulkaisut: julkaisu.hankkeenKuvaus puuttuu");
      }
      if (!julkaisu.aloituskuulutusPDFt) {
        throw new Error("adaptAloitusKuulutusJulkaisut: julkaisu.aloituskuulutusPDFt puuttuu");
      }
      if (!julkaisu.ilmoituksenVastaanottajat) {
        throw new Error("adaptAloitusKuulutusJulkaisut: julkaisu.ilmoituksenVastaanottajat puuttuu");
      }
      if (!kielitiedot) {
        throw new Error("adaptAloitusKuulutusJulkaisut: julkaisu.kielitiedot puuttuu");
      }
      const apiJulkaisu: API.AloitusKuulutusJulkaisu = {
        ...fieldsToCopyAsIs,
        __typename: "AloitusKuulutusJulkaisu",
        ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(julkaisu.ilmoituksenVastaanottajat),
        hankkeenKuvaus: adaptHankkeenKuvaus(julkaisu.hankkeenKuvaus),
        yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
        velho: adaptVelhoByAddingTypename(velho),
        suunnitteluSopimus: adaptSuunnitteluSopimusJulkaisu(oid, suunnitteluSopimus),
        kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
        aloituskuulutusPDFt: adaptJulkaisuPDFPaths(oid, julkaisu.aloituskuulutusPDFt),
      };
      return apiJulkaisu;
    });
  }
  return undefined;
}

function adaptJulkaisuPDFPaths(oid: string, aloitusKuulutusPDFS: LocalizedMap<AloitusKuulutusPDF>): API.AloitusKuulutusPDFt | undefined {
  if (!aloitusKuulutusPDFS) {
    return undefined;
  }

  const result: Partial<API.AloitusKuulutusPDFt> = { __typename: "AloitusKuulutusPDFt" };
  for (const kieli in aloitusKuulutusPDFS) {
    const pdfs = aloitusKuulutusPDFS[kieli as API.Kieli];
    if (!pdfs) {
      throw new Error(`adaptJulkaisuPDFPaths: aloitusKuulutusPDFS[${kieli}] määrittelemättä`);
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
