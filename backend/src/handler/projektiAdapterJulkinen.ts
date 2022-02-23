import { AloitusKuulutusJulkaisu, AloitusKuulutusPDF, DBProjekti, LocalizedMap } from "../database/model/projekti";
import * as API from "../../../common/graphql/apiModel";
import { AloitusKuulutusPDFt, AloitusKuulutusTila, Kieli, ProjektiJulkinen } from "../../../common/graphql/apiModel";
import pickBy from "lodash/pickBy";
import dayjs from "dayjs";
import {
  adaptHankkeenKuvaus,
  adaptKielitiedot,
  adaptSuunnitteluSopimus,
  adaptVelho,
  adaptYhteystiedot,
} from "./projektiAdapter";
import { fileService } from "../files/fileService";

class ProjektiAdapterJulkinen {
  public adaptProjekti(dbProjekti: DBProjekti): API.ProjektiJulkinen | undefined {
    const aloitusKuulutusJulkaisut = this.adaptAloitusKuulutusJulkaisut(
      dbProjekti.oid,
      dbProjekti.aloitusKuulutusJulkaisut
    );

    if (!checkIfAloitusKuulutusJulkaisutIsPublic(aloitusKuulutusJulkaisut)) {
      return undefined;
    }

    const projekti: ProjektiJulkinen = {
      __typename: "ProjektiJulkinen",
      oid: dbProjekti.oid,
      aloitusKuulutusJulkaisut,
    };
    return removeUndefinedFields(projekti) as API.ProjektiJulkinen;
  }

  adaptAloitusKuulutusJulkaisut(
    oid: string,
    aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null
  ): API.AloitusKuulutusJulkaisu[] | undefined {
    if (aloitusKuulutusJulkaisut) {
      return aloitusKuulutusJulkaisut
        .filter((julkaisu) => julkaisu.tila == AloitusKuulutusTila.HYVAKSYTTY)
        .map((julkaisu) => {
          const { yhteystiedot, velho, suunnitteluSopimus, kielitiedot } = julkaisu;

          return {
            __typename: "AloitusKuulutusJulkaisu",
            kuulutusPaiva: julkaisu.kuulutusPaiva,
            elyKeskus: julkaisu.elyKeskus,
            siirtyySuunnitteluVaiheeseen: julkaisu.siirtyySuunnitteluVaiheeseen,
            hankkeenKuvaus: adaptHankkeenKuvaus(julkaisu.hankkeenKuvaus),
            yhteystiedot: adaptYhteystiedot(yhteystiedot),
            velho: adaptVelho(velho),
            suunnitteluSopimus: adaptSuunnitteluSopimus(suunnitteluSopimus),
            kielitiedot: adaptKielitiedot(kielitiedot),
            aloituskuulutusPDF: this.adaptJulkaisuPDFPaths(oid, julkaisu.aloituskuulutusPDF),
          };
        });
    }
    return undefined;
  }

  adaptJulkaisuPDFPaths(
    oid: string,
    aloitusKuulutusPDFS: LocalizedMap<AloitusKuulutusPDF>
  ): AloitusKuulutusPDFt | undefined {
    if (!aloitusKuulutusPDFS) {
      return undefined;
    }

    const result = {};
    for (const kieli in aloitusKuulutusPDFS) {
      result[kieli] = {
        aloituskuulutusPDFPath: fileService.getPublicPathForProjektiFile(
          oid,
          aloitusKuulutusPDFS[kieli].aloituskuulutusPDFPath
        ),
        aloituskuulutusIlmoitusPDFPath: fileService.getPublicPathForProjektiFile(
          oid,
          aloitusKuulutusPDFS[kieli].aloituskuulutusIlmoitusPDFPath
        ),
      } as AloitusKuulutusPDF;
    }
    return { __typename: "AloitusKuulutusPDFt", SUOMI: result[Kieli.SUOMI], ...result };
  }
}

function checkIfAloitusKuulutusJulkaisutIsPublic(aloitusKuulutusJulkaisut: API.AloitusKuulutusJulkaisu[]): boolean {
  if (!(aloitusKuulutusJulkaisut && aloitusKuulutusJulkaisut.length == 1)) {
    return false;
  }

  const julkaisu = aloitusKuulutusJulkaisut[0];
  if (julkaisu.kuulutusPaiva && dayjs(julkaisu.kuulutusPaiva).isAfter(dayjs())) {
    return false;
  }

  return true;
}

function removeUndefinedFields(object: API.ProjektiJulkinen): Partial<API.ProjektiJulkinen> {
  return pickBy(object, (value) => value !== undefined);
}

export const projektiAdapterJulkinen = new ProjektiAdapterJulkinen();
