import { AloitusKuulutus, AloitusKuulutusJulkaisu, AloitusKuulutusPDF, LocalizedMap } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import {
  adaptHankkeenKuvaus,
  adaptKielitiedotByAddingTypename,
  adaptVelhoByAddingTypename,
  adaptYhteystiedotByAddingTypename,
  adaptStandardiYhteystiedotByAddingTypename,
  adaptIlmoituksenVastaanottajat,
} from "../common";
import { adaptSuunnitteluSopimus } from "./adaptSuunitteluSopimus";
import { fileService } from "../../../files/fileService";

export function adaptAloitusKuulutus(kuulutus?: AloitusKuulutus | null): API.AloitusKuulutus | undefined {
  if (kuulutus) {
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
      return {
        ...fieldsToCopyAsIs,
        __typename: "AloitusKuulutusJulkaisu",
        ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(julkaisu.ilmoituksenVastaanottajat),
        hankkeenKuvaus: adaptHankkeenKuvaus(julkaisu.hankkeenKuvaus),
        yhteystiedot: adaptYhteystiedotByAddingTypename(yhteystiedot),
        velho: adaptVelhoByAddingTypename(velho),
        suunnitteluSopimus: adaptSuunnitteluSopimus(oid, suunnitteluSopimus),
        kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
        aloituskuulutusPDFt: adaptJulkaisuPDFPaths(oid, julkaisu.aloituskuulutusPDFt),
      };
    });
  }
  return undefined;
}

function adaptJulkaisuPDFPaths(oid: string, aloitusKuulutusPDFS: LocalizedMap<AloitusKuulutusPDF>): API.AloitusKuulutusPDFt | undefined {
  if (!aloitusKuulutusPDFS) {
    return undefined;
  }

  const result = {};
  for (const kieli in aloitusKuulutusPDFS) {
    const aloitusKuulutusPdf: AloitusKuulutusPDF = {
      aloituskuulutusPDFPath: fileService.getYllapitoPathForProjektiFile(oid, aloitusKuulutusPDFS[kieli].aloituskuulutusPDFPath),
      aloituskuulutusIlmoitusPDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        aloitusKuulutusPDFS[kieli].aloituskuulutusIlmoitusPDFPath
      ),
    };
    result[kieli] = aloitusKuulutusPdf;
  }
  return { __typename: "AloitusKuulutusPDFt", SUOMI: result[API.Kieli.SUOMI], ...result };
}
