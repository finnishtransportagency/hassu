import {
  AloitusKuulutusJulkaisu,
  AloitusKuulutusPDF,
  DBProjekti,
  LocalizedMap,
  SuunnitteluSopimus,
} from "../database/model/projekti";
import * as API from "../../../common/graphql/apiModel";
import {
  AloitusKuulutusPDFt,
  AloitusKuulutusTila,
  Kieli,
  ProjektiJulkinen,
  Status,
} from "../../../common/graphql/apiModel";
import pickBy from "lodash/pickBy";
import dayjs from "dayjs";
import {
  adaptAineistot,
  adaptHankkeenKuvaus,
  adaptKielitiedot,
  adaptLinkkiList,
  adaptVelho,
  adaptVuorovaikutusTilaisuudet,
  adaptYhteystiedot,
} from "./projektiAdapter";
import { fileService } from "../files/fileService";
import { log } from "../logger";
import { parseDate } from "../util/dateUtil";
import { Vuorovaikutus } from "../database/model/suunnitteluVaihe";

class ProjektiAdapterJulkinen {
  applyStatus(projekti: ProjektiJulkinen) {
    function checkAloituskuulutus() {
      if (projekti.aloitusKuulutusJulkaisut) {
        const julkisetAloituskuulutukset = projekti.aloitusKuulutusJulkaisut.filter((julkaisu) => {
          return julkaisu.kuulutusPaiva && parseDate(julkaisu.kuulutusPaiva).isBefore(dayjs());
        });

        if (julkisetAloituskuulutukset?.length > 0) {
          projekti.status = Status.ALOITUSKUULUTUS;
        }
      }
    }

    function checkSuunnittelu() {
      // Valiaikainen ui kehitysta varten, kunnes suunnitteluvaihe tietomallissa
      if (projekti.suunnitteluVaihe) {
        projekti.status = Status.SUUNNITTELU;
      }
    }

    projekti.status = Status.EI_JULKAISTU;

    checkAloituskuulutus();

    checkSuunnittelu();

    // checkNahtavillaolo();

    // checkHyvaksyttavana();

    // checkPaatos();

    // checkLainvoima();

    return projekti;
  }

  public adaptProjekti(dbProjekti: DBProjekti): API.ProjektiJulkinen | undefined {
    const aloitusKuulutusJulkaisut = this.adaptAloitusKuulutusJulkaisut(
      dbProjekti.oid,
      dbProjekti.aloitusKuulutusJulkaisut
    );

    if (!checkIfAloitusKuulutusJulkaisutIsPublic(aloitusKuulutusJulkaisut)) {
      return undefined;
    }

    let suunnitteluVaihe = undefined;
    if (dbProjekti.suunnitteluVaihe?.julkinen) {
      suunnitteluVaihe = ProjektiAdapterJulkinen.adaptSuunnitteluVaihe(dbProjekti);
    }

    const projekti: ProjektiJulkinen = {
      __typename: "ProjektiJulkinen",
      oid: dbProjekti.oid,
      euRahoitus: dbProjekti.euRahoitus,
      suunnitteluVaihe,
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

  private static adaptSuunnitteluVaihe(dbProjekti: DBProjekti): API.SuunnitteluVaiheJulkinen {
    const { hankkeenKuvaus, arvioSeuraavanVaiheenAlkamisesta } = dbProjekti.suunnitteluVaihe;
    return {
      __typename: "SuunnitteluVaiheJulkinen",
      hankkeenKuvaus: adaptHankkeenKuvaus(hankkeenKuvaus),
      arvioSeuraavanVaiheenAlkamisesta,
      vuorovaikutukset: adaptVuorovaikutukset(dbProjekti),
    };
  }
}

function adaptVuorovaikutukset(dbProjekti: DBProjekti): API.VuorovaikutusJulkinen[] {
  const vuorovaikutukset = dbProjekti.vuorovaikutukset;
  if (vuorovaikutukset && vuorovaikutukset.length > 0) {
    return vuorovaikutukset
      .map((vuorovaikutus) => {
        const julkaisuPaiva = parseDate(vuorovaikutus.vuorovaikutusJulkaisuPaiva);
        if (julkaisuPaiva.isBefore(dayjs())) {
          const aineistoPoistetaanNakyvista = parseDate(vuorovaikutus.aineistoPoistetaanNakyvista);
          return {
            ...vuorovaikutus,
            __typename: "VuorovaikutusJulkinen",
            vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudet(vuorovaikutus.vuorovaikutusTilaisuudet),
            videot: adaptLinkkiList(vuorovaikutus.videot),
            aineistot: adaptAineistot(vuorovaikutus.aineistot, julkaisuPaiva, aineistoPoistetaanNakyvista),
            vuorovaikutusYhteystiedot: adaptAndMergeYhteystiedot(dbProjekti, vuorovaikutus),
          } as API.VuorovaikutusJulkinen;
        }
        return undefined;
      })
      .filter((obj) => obj);
  }
  return vuorovaikutukset as undefined;
}

function checkIfAloitusKuulutusJulkaisutIsPublic(
  aloitusKuulutusJulkaisut: API.AloitusKuulutusJulkaisuJulkinen[]
): boolean {
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

function adaptAndMergeYhteystiedot(dbProjekti: DBProjekti, vuorovaikutus: Vuorovaikutus) {
  let vuorovaikutusYhteystiedot = adaptYhteystiedotFromUsernames(dbProjekti, vuorovaikutus.vuorovaikutusYhteysHenkilot);
  if (!vuorovaikutusYhteystiedot) {
    vuorovaikutusYhteystiedot = [];
  }
  const yhteystiedot = adaptYhteystiedot(vuorovaikutus.esitettavatYhteystiedot);
  if (yhteystiedot) {
    vuorovaikutusYhteystiedot = vuorovaikutusYhteystiedot.concat(yhteystiedot);
  }
  return vuorovaikutusYhteystiedot;
}

function adaptYhteystiedotFromUsernames(
  dbProjekti: DBProjekti,
  usernames?: Array<string>
): API.Yhteystieto[] | undefined {
  if (!usernames || usernames.length == 0) {
    return undefined;
  }
  const kayttoOikeudet = dbProjekti.kayttoOikeudet;
  return usernames
    .map((username) => {
      const user = kayttoOikeudet.find((projektiUser) => projektiUser.kayttajatunnus == username);
      if (!user) {
        return undefined;
      }
      const lastnameFirstname = user.nimi.split(",");
      return {
        __typename: "Yhteystieto",
        etunimi: lastnameFirstname[1]?.trim(),
        sukunimi: lastnameFirstname[0]?.trim(),
        organisaatio: user.organisaatio,
        puhelinnumero: user.puhelinnumero,
        sahkoposti: user.email,
      } as API.Yhteystieto;
    })
    .filter((obj) => obj);
}

function removeUndefinedFields(object: API.ProjektiJulkinen): Partial<API.ProjektiJulkinen> {
  return pickBy(object, (value) => value !== undefined);
}

export const projektiAdapterJulkinen = new ProjektiAdapterJulkinen();
