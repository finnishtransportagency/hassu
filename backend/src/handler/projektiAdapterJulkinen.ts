import {
  AloitusKuulutusJulkaisu,
  AloitusKuulutusPDF,
  DBProjekti,
  LocalizedMap,
  SuunnitteluSopimus,
} from "../database/model/projekti";
import * as API from "../../../common/graphql/apiModel";
import { AloitusKuulutusPDFt, AloitusKuulutusTila, Kieli, ProjektiJulkinen } from "../../../common/graphql/apiModel";
import pickBy from "lodash/pickBy";
import dayjs from "dayjs";
import { adaptHankkeenKuvaus, adaptKielitiedot, adaptVelho, adaptYhteystiedot } from "./projektiAdapter";
import { fileService } from "../files/fileService";
import { log } from "../logger";
import { parseDate } from "../util/dateUtil";

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
      euRahoitus: dbProjekti.euRahoitus,
      aloitusKuulutusJulkaisut,
    };
    return removeUndefinedFields(projekti) as API.ProjektiJulkinen;
  }

  adaptAloitusKuulutusJulkaisut(
    oid: string,
    aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null
  ): API.AloitusKuulutusJulkaisuJulkinen[] | undefined {
    if (aloitusKuulutusJulkaisut) {
      return aloitusKuulutusJulkaisut
        .filter((julkaisu) => julkaisu.tila == AloitusKuulutusTila.HYVAKSYTTY)
        .map((julkaisu) => {
          const { yhteystiedot, velho, suunnitteluSopimus, kielitiedot } = julkaisu;

          return {
            __typename: "AloitusKuulutusJulkaisuJulkinen",
            kuulutusPaiva: julkaisu.kuulutusPaiva,
            elyKeskus: julkaisu.elyKeskus,
            siirtyySuunnitteluVaiheeseen: julkaisu.siirtyySuunnitteluVaiheeseen,
            hankkeenKuvaus: adaptHankkeenKuvaus(julkaisu.hankkeenKuvaus),
            yhteystiedot: adaptYhteystiedot(yhteystiedot),
            velho: adaptVelho(velho),
            suunnitteluSopimus: this.adaptSuunnitteluSopimus(oid, suunnitteluSopimus),
            kielitiedot: adaptKielitiedot(kielitiedot),
            aloituskuulutusPDFt: this.adaptJulkaisuPDFPaths(oid, julkaisu.aloituskuulutusPDFt),
          };
        });
    }
    return undefined;
  }

  adaptSuunnitteluSopimus(
    oid: string,
    suunnitteluSopimus?: SuunnitteluSopimus | null
  ): API.SuunnitteluSopimus | undefined | null {
    if (suunnitteluSopimus) {
      return {
        __typename: "SuunnitteluSopimus",
        ...suunnitteluSopimus,
        logo: fileService.getPublicPathForProjektiFile(oid, suunnitteluSopimus.logo),
      };
    }
    return suunnitteluSopimus as undefined | null;
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

function checkIfAloitusKuulutusJulkaisutIsPublic(aloitusKuulutusJulkaisut: API.AloitusKuulutusJulkaisuJulkinen[]): boolean {
  if (!(aloitusKuulutusJulkaisut && aloitusKuulutusJulkaisut.length == 1)) {
    log.info("Projektilla ei ole hyväksyttyä aloituskuulutusta");
    return false;
  }

  const julkaisu = aloitusKuulutusJulkaisut[0];
  if (julkaisu.kuulutusPaiva && parseDate(julkaisu.kuulutusPaiva).isAfter(dayjs())) {
    log.info("Projektin aloituskuulutuksen kuulutuspäivä on tulevaisuudessa", {
      kuulutusPaiva: parseDate(julkaisu.kuulutusPaiva).format(),
      now: dayjs().format(),
    });
    return false;
  }
  return true;
}

function removeUndefinedFields(object: API.ProjektiJulkinen): Partial<API.ProjektiJulkinen> {
  return pickBy(object, (value) => value !== undefined);
}

export const projektiAdapterJulkinen = new ProjektiAdapterJulkinen();
