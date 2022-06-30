import {
  Aineisto,
  AloitusKuulutusJulkaisu,
  AloitusKuulutusPDF,
  DBProjekti,
  DBVaylaUser,
  LocalizedMap,
  NahtavillaoloVaiheJulkaisu,
  SuunnitteluSopimus,
  Velho,
  Vuorovaikutus,
  VuorovaikutusTilaisuus,
} from "../database/model";
import * as API from "../../../common/graphql/apiModel";
import pickBy from "lodash/pickBy";
import dayjs, { Dayjs } from "dayjs";
import {
  adaptHankkeenKuvaus,
  adaptKielitiedot,
  adaptLinkki,
  adaptLinkkiList,
  adaptYhteystiedot,
} from "./projektiAdapter";
import { fileService } from "../files/fileService";
import { log } from "../logger";
import { parseDate } from "../util/dateUtil";
import { PathTuple, ProjektiPaths } from "../files/ProjektiPath";

class ProjektiAdapterJulkinen {
  private applyStatus(projekti: API.ProjektiJulkinen) {
    function checkAloituskuulutus() {
      if (projekti.aloitusKuulutusJulkaisut) {
        const julkisetAloituskuulutukset = projekti.aloitusKuulutusJulkaisut.filter((julkaisu) => {
          return julkaisu.kuulutusPaiva && parseDate(julkaisu.kuulutusPaiva).isBefore(dayjs());
        });

        if (julkisetAloituskuulutukset?.length > 0) {
          projekti.status = API.Status.ALOITUSKUULUTUS;
        }
      }
    }

    function checkSuunnittelu() {
      // Valiaikainen ui kehitysta varten, kunnes suunnitteluvaihe tietomallissa
      if (projekti.suunnitteluVaihe) {
        projekti.status = API.Status.SUUNNITTELU;
      }
    }

    function checkNahtavillaolo() {
      const nahtavillaoloVaiheJulkaisut = projekti.nahtavillaoloVaiheJulkaisut?.filter((julkaisu) => {
        return julkaisu.kuulutusPaiva && parseDate(julkaisu.kuulutusPaiva).isBefore(dayjs());
      });

      if (nahtavillaoloVaiheJulkaisut) {
        projekti.status = API.Status.NAHTAVILLAOLO;
      }
    }

    projekti.status = API.Status.EI_JULKAISTU;

    checkAloituskuulutus();

    checkSuunnittelu();

    checkNahtavillaolo();

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

    const projektiHenkilot: ProjektiHenkilot = adaptProjektiHenkilot(dbProjekti.kayttoOikeudet);

    let suunnitteluVaihe = undefined;
    if (dbProjekti.suunnitteluVaihe?.julkinen) {
      suunnitteluVaihe = ProjektiAdapterJulkinen.adaptSuunnitteluVaihe(dbProjekti, projektiHenkilot);
    }

    const nahtavillaoloVaiheJulkaisut = ProjektiAdapterJulkinen.adaptNahtavillaoloVaiheJulkaisut(
      dbProjekti,
      projektiHenkilot
    );
    const projekti: API.ProjektiJulkinen = {
      __typename: "ProjektiJulkinen",
      oid: dbProjekti.oid,
      kielitiedot: adaptKielitiedot(dbProjekti.kielitiedot),
      velho: adaptVelho(dbProjekti.velho),
      euRahoitus: dbProjekti.euRahoitus,
      suunnitteluVaihe,
      aloitusKuulutusJulkaisut,
      paivitetty: dbProjekti.paivitetty,
      projektiHenkilot: Object.values(projektiHenkilot),
      nahtavillaoloVaiheJulkaisut,
    };
    const projektiJulkinen = removeUndefinedFields(projekti) as API.ProjektiJulkinen;
    return this.applyStatus(projektiJulkinen);
  }

  adaptAloitusKuulutusJulkaisut(
    oid: string,
    aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null
  ): API.AloitusKuulutusJulkaisuJulkinen[] | undefined {
    if (aloitusKuulutusJulkaisut) {
      // Pick HYVAKSYTTY or MIGROITU aloituskuulutusjulkaisu, by this order
      const julkaisu =
        findJulkaisuByStatus(aloitusKuulutusJulkaisut, API.AloitusKuulutusTila.HYVAKSYTTY) ||
        findJulkaisuByStatus(aloitusKuulutusJulkaisut, API.AloitusKuulutusTila.MIGROITU);
      if (!julkaisu) {
        return undefined;
      }
      const { yhteystiedot, velho, suunnitteluSopimus, kielitiedot } = julkaisu;

      return [
        {
          __typename: "AloitusKuulutusJulkaisuJulkinen",
          kuulutusPaiva: julkaisu.kuulutusPaiva,
          siirtyySuunnitteluVaiheeseen: julkaisu.siirtyySuunnitteluVaiheeseen,
          hankkeenKuvaus: adaptHankkeenKuvaus(julkaisu.hankkeenKuvaus),
          yhteystiedot: adaptYhteystiedot(yhteystiedot),
          velho: adaptVelho(velho),
          suunnitteluSopimus: this.adaptSuunnitteluSopimus(oid, suunnitteluSopimus),
          kielitiedot: adaptKielitiedot(kielitiedot),
          aloituskuulutusPDFt: this.adaptJulkaisuPDFPaths(oid, julkaisu.aloituskuulutusPDFt),
          tila: julkaisu.tila,
        },
      ];
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
  ): API.AloitusKuulutusPDFt | undefined {
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
    return { __typename: "AloitusKuulutusPDFt", SUOMI: result[API.Kieli.SUOMI], ...result };
  }

  private static adaptSuunnitteluVaihe(
    dbProjekti: DBProjekti,
    projektiHenkilot: ProjektiHenkilot
  ): API.SuunnitteluVaiheJulkinen {
    const { hankkeenKuvaus, arvioSeuraavanVaiheenAlkamisesta, suunnittelunEteneminenJaKesto } =
      dbProjekti.suunnitteluVaihe;
    return {
      __typename: "SuunnitteluVaiheJulkinen",
      hankkeenKuvaus: adaptHankkeenKuvaus(hankkeenKuvaus),
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      vuorovaikutukset: adaptVuorovaikutukset(dbProjekti, projektiHenkilot),
    };
  }

  //TODO: lisaa julkisia kenttia ja tarkista yhteystietojen osalta onko tarve mergelle henkiloiden kanssa
  private static adaptNahtavillaoloVaiheJulkaisut(
    dbProjekti: DBProjekti,
    projektiHenkilot: ProjektiHenkilot
  ): API.NahtavillaoloVaiheJulkaisuJulkinen[] {
    return dbProjekti.nahtavillaoloVaiheJulkaisut?.filter(isNahtavillaoloVaihePublic).map((julkaisu) => {
      const {
        aineistoNahtavilla,
        hankkeenKuvaus,
        kuulutusPaiva,
        kuulutusVaihePaattyyPaiva,
        kuulutusYhteysHenkilot,
        kuulutusYhteystiedot,
        muistutusoikeusPaattyyPaiva,
        velho,
      } = julkaisu;
      const paths = new ProjektiPaths(dbProjekti.oid).nahtavillaoloVaihe(julkaisu);

      return {
        __typename: "NahtavillaoloVaiheJulkaisuJulkinen",
        aineistoNahtavilla: adaptAineistotJulkinen(dbProjekti.oid, aineistoNahtavilla, paths),
        hankkeenKuvaus: adaptHankkeenKuvaus(hankkeenKuvaus),
        kuulutusPaiva,
        kuulutusVaihePaattyyPaiva,
        muistutusoikeusPaattyyPaiva,
        kuulutusYhteysHenkilot: adaptUsernamesToProjektiHenkiloIds(kuulutusYhteysHenkilot, projektiHenkilot),
        kuulutusYhteystiedot: adaptYhteystiedot(kuulutusYhteystiedot),
        velho: adaptVelho(velho),
      };
    });
  }
}

function isUnsetOrInPast(julkaisuPaiva: dayjs.Dayjs) {
  return !julkaisuPaiva || julkaisuPaiva.isBefore(dayjs());
}

function adaptAineistotJulkinen(
  oid: string,
  aineistot: Aineisto[] | null,
  paths: PathTuple | undefined,
  julkaisuPaiva?: Dayjs
): API.Aineisto[] | undefined {
  if (isUnsetOrInPast(julkaisuPaiva) && aineistot && aineistot.length > 0) {
    return aineistot
      .filter((aineisto) => aineisto.tila == API.AineistoTila.VALMIS && aineisto.tiedosto)
      .map((aineisto) => {
        const { nimi, dokumenttiOid, jarjestys, kategoriaId } = aineisto;
        let publicFilePath = aineisto.tiedosto;
        if (paths) {
          publicFilePath = aineisto.tiedosto.replace(paths.yllapitoPath, paths.publicPath);
        } // Replace ylläpito path with public path
        const tiedosto = fileService.getPublicPathForProjektiFile(oid, publicFilePath);
        return {
          __typename: "Aineisto",
          dokumenttiOid,
          tiedosto,
          nimi,
          jarjestys,
          kategoriaId,
        };
      });
  }
  return undefined;
}

function adaptUsernamesToProjektiHenkiloIds(usernames: Array<string>, projektiHenkilot: ProjektiHenkilot) {
  return usernames?.map((username) => projektiHenkilot[username].id);
}

function adaptVuorovaikutukset(
  dbProjekti: DBProjekti,
  projektiHenkilot: ProjektiHenkilot
): API.VuorovaikutusJulkinen[] {
  const vuorovaikutukset = dbProjekti.vuorovaikutukset;
  if (vuorovaikutukset && vuorovaikutukset.length > 0) {
    return vuorovaikutukset
      .map((vuorovaikutus) => {
        const julkaisuPaiva = parseDate(vuorovaikutus.vuorovaikutusJulkaisuPaiva);
        if (julkaisuPaiva.isBefore(dayjs())) {
          const usernames = vuorovaikutus.vuorovaikutusYhteysHenkilot;
          return {
            ...vuorovaikutus,
            __typename: "VuorovaikutusJulkinen",
            vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudet(
              vuorovaikutus.vuorovaikutusTilaisuudet,
              projektiHenkilot
            ),
            videot: adaptLinkkiList(vuorovaikutus.videot),
            suunnittelumateriaali: adaptLinkki(vuorovaikutus.suunnittelumateriaali),
            esittelyaineistot: adaptAineistotJulkinen(
              dbProjekti.oid,
              vuorovaikutus.esittelyaineistot,
              undefined,
              julkaisuPaiva
            ),
            suunnitelmaluonnokset: adaptAineistotJulkinen(
              dbProjekti.oid,
              vuorovaikutus.suunnitelmaluonnokset,
              undefined,
              julkaisuPaiva
            ),
            vuorovaikutusYhteystiedot: adaptAndMergeYhteystiedot(dbProjekti, vuorovaikutus),
            vuorovaikutusYhteysHenkilot: adaptUsernamesToProjektiHenkiloIds(usernames, projektiHenkilot),
          } as API.VuorovaikutusJulkinen;
        }
        return undefined;
      })
      .filter((obj) => obj);
  }
  return vuorovaikutukset as undefined;
}

function adaptVuorovaikutusTilaisuudet(
  vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuus>,
  projektiHenkilot: ProjektiHenkilot
): VuorovaikutusTilaisuus[] {
  if (vuorovaikutusTilaisuudet) {
    return vuorovaikutusTilaisuudet.map((vuorovaikutusTilaisuus) => ({
      ...vuorovaikutusTilaisuus,
      projektiYhteysHenkilot: adaptUsernamesToProjektiHenkiloIds(
        vuorovaikutusTilaisuus.projektiYhteysHenkilot,
        projektiHenkilot
      ),
      esitettavatYhteystiedot: adaptYhteystiedot(vuorovaikutusTilaisuus.esitettavatYhteystiedot),
      __typename: "VuorovaikutusTilaisuus",
    }));
  }
  return vuorovaikutusTilaisuudet as undefined;
}

function findJulkaisuByStatus<T extends { tila?: API.AloitusKuulutusTila }>(
  aloitusKuulutusJulkaisut: T[],
  tila: API.AloitusKuulutusTila
): T {
  return aloitusKuulutusJulkaisut.filter((j) => j.tila == tila).pop();
}

function checkIfAloitusKuulutusJulkaisutIsPublic(
  aloitusKuulutusJulkaisut: API.AloitusKuulutusJulkaisuJulkinen[]
): boolean {
  if (!(aloitusKuulutusJulkaisut && aloitusKuulutusJulkaisut.length == 1)) {
    log.info("Projektilla ei ole hyväksyttyä aloituskuulutusta");
    return false;
  }

  const hyvaksyttyJulkaisu = findJulkaisuByStatus(aloitusKuulutusJulkaisut, API.AloitusKuulutusTila.HYVAKSYTTY);
  if (hyvaksyttyJulkaisu) {
    if (hyvaksyttyJulkaisu.kuulutusPaiva && parseDate(hyvaksyttyJulkaisu.kuulutusPaiva).isAfter(dayjs())) {
      log.info("Projektin aloituskuulutuksen kuulutuspäivä on tulevaisuudessa", {
        kuulutusPaiva: parseDate(hyvaksyttyJulkaisu.kuulutusPaiva).format(),
        now: dayjs().format(),
      });
      return false;
    }
  } else if (!findJulkaisuByStatus(aloitusKuulutusJulkaisut, API.AloitusKuulutusTila.MIGROITU)) {
    // If there are no HYVAKSYTTY or MIGROITU aloitusKuulutusJulkaisu, hide projekti
    return false;
  }
  return true;
}

function isNahtavillaoloVaihePublic(nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu): boolean {
  if (!nahtavillaoloVaihe) {
    return false;
  }
  if (nahtavillaoloVaihe.tila !== API.NahtavillaoloVaiheTila.HYVAKSYTTY) {
    return false;
  }
  if (parseDate(nahtavillaoloVaihe.kuulutusPaiva).isAfter(dayjs())) {
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

export function adaptVelho(velho: Velho): API.VelhoJulkinen {
  const {
    nimi,
    tyyppi,
    kunnat,
    maakunnat,
    suunnittelustaVastaavaViranomainen,
    vaylamuoto,
    asiatunnusVayla,
    asiatunnusELY,
    kuvaus,
    tilaajaOrganisaatio,
    toteuttavaOrganisaatio,
  } = velho;
  return {
    __typename: "VelhoJulkinen",
    nimi,
    tyyppi,
    kunnat: kunnat?.map((s) => s.trim()),
    maakunnat: maakunnat?.map((s) => s.trim()),
    suunnittelustaVastaavaViranomainen,
    vaylamuoto,
    asiatunnusVayla,
    asiatunnusELY,
    kuvaus,
    tilaajaOrganisaatio,
    toteuttavaOrganisaatio,
  };
}

type ProjektiHenkilot = { [id: string]: API.ProjektiKayttajaJulkinen };

function adaptProjektiHenkilot(kayttoOikeudet: DBVaylaUser[]): ProjektiHenkilot {
  return kayttoOikeudet?.reduce((result: ProjektiHenkilot, user, index) => {
    result[user.kayttajatunnus] = {
      id: `${index}`,
      __typename: "ProjektiKayttajaJulkinen",
      nimi: user.nimi,
      email: user.email,
      puhelinnumero: user.puhelinnumero,
      organisaatio: user.organisaatio,
    };
    return result;
  }, {});
}

export const projektiAdapterJulkinen = new ProjektiAdapterJulkinen();
