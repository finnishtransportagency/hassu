import { AloitusKuulutus, AloitusKuulutusJulkaisu, LocalizedMap, AloitusKuulutusPDF } from "../../database/model";
import * as API from "../../../../common/graphql/apiModel";
import { adaptHankkeenKuvaus } from "../commonAdapterUtil/adaptHankkeenKuvaus";
import {
  adaptVelho as lisaaVelhoTypename,
  adaptKielitiedot as lisaaKielitiedotTypename,
  adaptYhteystiedot as lisaaYhteystietoTypenameListaan,
} from "../commonAdapterUtil/lisaaTypename";
import { adaptSuunnitteluSopimus } from "./adaptSuunitteluSopimus";
import { fileService } from "../../files/fileService";

export function adaptAloitusKuulutus(kuulutus?: AloitusKuulutus | null): API.AloitusKuulutus | undefined {
  if (kuulutus) {
    const { esitettavatYhteystiedot, ...otherKuulutusFields } = kuulutus;
    const yhteystiedot = lisaaYhteystietoTypenameListaan(esitettavatYhteystiedot);
    return {
      __typename: "AloitusKuulutus",
      ...otherKuulutusFields,
      esitettavatYhteystiedot: yhteystiedot,
      hankkeenKuvaus: adaptHankkeenKuvaus(kuulutus.hankkeenKuvaus),
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
        hankkeenKuvaus: adaptHankkeenKuvaus(julkaisu.hankkeenKuvaus),
        yhteystiedot: lisaaYhteystietoTypenameListaan(yhteystiedot),
        velho: lisaaVelhoTypename(velho),
        suunnitteluSopimus: adaptSuunnitteluSopimus(oid, suunnitteluSopimus),
        kielitiedot: lisaaKielitiedotTypename(kielitiedot),
        aloituskuulutusPDFt: adaptJulkaisuPDFPaths(oid, julkaisu.aloituskuulutusPDFt),
      };
    });
  }
  return undefined;
}

function adaptJulkaisuPDFPaths(
  oid: string,
  aloitusKuulutusPDFS: LocalizedMap<AloitusKuulutusPDF>
): API.AloitusKuulutusPDFt | undefined {
  if (!aloitusKuulutusPDFS) {
    return undefined;
  }

  const result = {};
  for (const kieli in aloitusKuulutusPDFS) {
    result[kieli] = {
      aloituskuulutusPDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        aloitusKuulutusPDFS[kieli].aloituskuulutusPDFPath
      ),
      aloituskuulutusIlmoitusPDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        aloitusKuulutusPDFS[kieli].aloituskuulutusIlmoitusPDFPath
      ),
    } as AloitusKuulutusPDF;
  }
  return { __typename: "AloitusKuulutusPDFt", SUOMI: result[API.Kieli.SUOMI], ...result };
}
