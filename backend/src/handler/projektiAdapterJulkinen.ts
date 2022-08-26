import {
  Aineisto,
  AloitusKuulutusJulkaisu,
  AloitusKuulutusPDF,
  DBProjekti,
  DBVaylaUser,
  HyvaksymisPaatosVaiheJulkaisu,
  LocalizedMap,
  NahtavillaoloVaiheJulkaisu,
  SuunnitteluSopimus,
  Velho,
  Vuorovaikutus,
  VuorovaikutusTilaisuus,
  Yhteystieto,
} from "../database/model";
import * as API from "../../../common/graphql/apiModel";
import {
  HyvaksymisPaatosVaiheJulkaisuJulkinen,
  NahtavillaoloVaiheJulkaisuJulkinen,
} from "../../../common/graphql/apiModel";
import pickBy from "lodash/pickBy";
import dayjs, { Dayjs } from "dayjs";
import {
  adaptHankkeenKuvaus,
  adaptKielitiedot,
  adaptLinkki,
  adaptLinkkiList,
  adaptYhteystiedot,
  findJulkaisuByStatus,
  findPublishedAloitusKuulutusJulkaisu,
  isDateInThePast,
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
      const kuulutusPaiva = projekti.nahtavillaoloVaihe?.kuulutusPaiva;
      if (kuulutusPaiva && parseDate(kuulutusPaiva).isBefore(dayjs())) {
        projekti.status = API.Status.NAHTAVILLAOLO;
      }
    }

    function checkHyvaksymisMenettelyssa() {
      const nahtavillaoloVaihe = projekti.nahtavillaoloVaihe;
      if (isDateInThePast(nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva)) {
        projekti.status = API.Status.HYVAKSYMISMENETTELYSSA;
      }
    }

    function checkHyvaksytty() {
      const hyvaksymisPaatosVaihe = projekti.hyvaksymisPaatosVaihe;
      if (isDateInThePast(hyvaksymisPaatosVaihe?.kuulutusPaiva)) {
        projekti.status = API.Status.HYVAKSYTTY;
      }
    }

    projekti.status = API.Status.EI_JULKAISTU;

    checkAloituskuulutus();

    checkSuunnittelu();

    checkNahtavillaolo();

    checkHyvaksymisMenettelyssa();

    checkHyvaksytty();

    // checkLainvoima();

    return projekti;
  }

  public adaptProjekti(dbProjekti: DBProjekti): API.ProjektiJulkinen | undefined {
    // Määritä projektipäällikkö ja muotoile se Yhteystieto-objektiksi.
    const projektiPaallikkoVaylaDBUserina = dbProjekti.kayttoOikeudet.find(
      (hlo) => hlo.email === dbProjekti.velho.vastuuhenkilonEmail
    );
    const { nimi, email, ...ppIlmanNimea } = projektiPaallikkoVaylaDBUserina;
    const projektiPaallikko: Yhteystieto = {
      ...ppIlmanNimea,
      etunimi: nimi.split(",")[0].trim(),
      sukunimi: nimi.split(",")[1].trim(),
      sahkoposti: email,
    };
    const aloitusKuulutusJulkaisut = this.adaptAloitusKuulutusJulkaisut(
      projektiPaallikko,
      dbProjekti.oid,
      dbProjekti.aloitusKuulutusJulkaisut
    );

    if (!checkIfAloitusKuulutusJulkaisutIsPublic(aloitusKuulutusJulkaisut)) {
      return undefined;
    }

    const projektiHenkilot: ProjektiHenkilot = adaptProjektiHenkilot(dbProjekti.kayttoOikeudet);

    let suunnitteluVaihe = undefined;
    if (dbProjekti.suunnitteluVaihe?.julkinen) {
      suunnitteluVaihe = ProjektiAdapterJulkinen.adaptSuunnitteluVaihe(projektiPaallikko, dbProjekti, projektiHenkilot);
    }

    const nahtavillaoloVaihe = ProjektiAdapterJulkinen.adaptNahtavillaoloVaiheJulkaisu(
      projektiPaallikko,
      dbProjekti,
      projektiHenkilot
    );
    const hyvaksymisPaatosVaihe = ProjektiAdapterJulkinen.adaptHyvaksymisPaatosVaihe(
      projektiPaallikko,
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
      nahtavillaoloVaihe,
      hyvaksymisPaatosVaihe,
    };
    const projektiJulkinen = removeUndefinedFields(projekti) as API.ProjektiJulkinen;
    return this.applyStatus(projektiJulkinen);
  }

  adaptAloitusKuulutusJulkaisut(
    projektiPaallikko: Yhteystieto,
    oid: string,
    aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null
  ): API.AloitusKuulutusJulkaisuJulkinen[] | undefined {
    if (aloitusKuulutusJulkaisut) {
      // Pick HYVAKSYTTY or MIGROITU aloituskuulutusjulkaisu, by this order
      const julkaisu = findPublishedAloitusKuulutusJulkaisu(aloitusKuulutusJulkaisut);
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
          yhteystiedot: adaptYhteystiedot(projektiPaallikko, yhteystiedot),
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
    projektiPaallikko,
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
      vuorovaikutukset: adaptVuorovaikutukset(projektiPaallikko, dbProjekti, projektiHenkilot),
    };
  }

  private static adaptNahtavillaoloVaiheJulkaisu(
    projektiPaallikko: Yhteystieto,
    dbProjekti: DBProjekti,
    projektiHenkilot: ProjektiHenkilot
  ): API.NahtavillaoloVaiheJulkaisuJulkinen {
    const julkaisu = pickExactlyOneNahtavillaoloVaiheJulkaisu(dbProjekti.nahtavillaoloVaiheJulkaisut);
    if (julkaisu) {
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

      let apiAineistoNahtavilla: API.Aineisto[];
      if (!isKuulutusNahtavillaVaiheOver(julkaisu)) {
        apiAineistoNahtavilla = adaptAineistotJulkinen(dbProjekti.oid, aineistoNahtavilla, paths);
      }
      return {
        __typename: "NahtavillaoloVaiheJulkaisuJulkinen",
        aineistoNahtavilla: apiAineistoNahtavilla,
        hankkeenKuvaus: adaptHankkeenKuvaus(hankkeenKuvaus),
        kuulutusPaiva,
        kuulutusVaihePaattyyPaiva,
        muistutusoikeusPaattyyPaiva,
        kuulutusYhteysHenkilot: adaptUsernamesToProjektiHenkiloIds(kuulutusYhteysHenkilot, projektiHenkilot),
        kuulutusYhteystiedot: adaptYhteystiedot(projektiPaallikko, kuulutusYhteystiedot),
        velho: adaptVelho(velho),
      };
    }
  }

  private static adaptHyvaksymisPaatosVaihe(
    projektiPaallikko: Yhteystieto,
    dbProjekti: DBProjekti,
    projektiHenkilot: ProjektiHenkilot
  ): API.HyvaksymisPaatosVaiheJulkaisuJulkinen {
    const julkaisu = pickExactlyOneHyvaksymisPaatosVaihe(dbProjekti.hyvaksymisPaatosVaiheJulkaisut);
    if (julkaisu) {
      const {
        hyvaksymisPaatos,
        aineistoNahtavilla,
        kuulutusPaiva,
        kuulutusVaihePaattyyPaiva,
        kuulutusYhteysHenkilot,
        kuulutusYhteystiedot,
        velho,
        kielitiedot,
        hallintoOikeus,
      } = julkaisu;
      const paths = new ProjektiPaths(dbProjekti.oid).hyvaksymisPaatosVaihe(julkaisu);

      let apiHyvaksymisPaatosAineisto: API.Aineisto[];
      let apiAineistoNahtavilla: API.Aineisto[];
      if (!isKuulutusNahtavillaVaiheOver(julkaisu)) {
        apiHyvaksymisPaatosAineisto = adaptAineistotJulkinen(dbProjekti.oid, hyvaksymisPaatos, paths);
        apiAineistoNahtavilla = adaptAineistotJulkinen(dbProjekti.oid, aineistoNahtavilla, paths);
      }
      const hyvaksymispaatos = dbProjekti.kasittelynTila.hyvaksymispaatos;
      return {
        __typename: "HyvaksymisPaatosVaiheJulkaisuJulkinen",
        hyvaksymisPaatos: apiHyvaksymisPaatosAineisto,
        hyvaksymisPaatoksenPvm: hyvaksymispaatos.paatoksenPvm,
        hyvaksymisPaatoksenAsianumero: hyvaksymispaatos.asianumero,
        aineistoNahtavilla: apiAineistoNahtavilla,
        kuulutusPaiva,
        kuulutusVaihePaattyyPaiva,
        kuulutusYhteysHenkilot: adaptUsernamesToProjektiHenkiloIds(kuulutusYhteysHenkilot, projektiHenkilot),
        kuulutusYhteystiedot: adaptYhteystiedot(projektiPaallikko, kuulutusYhteystiedot),
        velho: adaptVelho(velho),
        kielitiedot: adaptKielitiedot(kielitiedot),
        hallintoOikeus,
      };
    }
  }
}

function pickExactlyOneNahtavillaoloVaiheJulkaisu(
  nahtavillaoloVaiheJulkaisut: NahtavillaoloVaiheJulkaisu[]
): NahtavillaoloVaiheJulkaisu | undefined {
  const julkaisut = nahtavillaoloVaiheJulkaisut?.filter(isNahtavillaoloVaihePublic);
  if (julkaisut) {
    if (julkaisut.length > 1) {
      throw new Error("Bug: vain yksi nähtävilläolo voi olla julkinen kerrallaan");
    }
    return julkaisut.pop();
  }
}

function pickExactlyOneHyvaksymisPaatosVaihe(
  hyvaksymisPaatosVaiheJulkaisut: HyvaksymisPaatosVaiheJulkaisu[]
): HyvaksymisPaatosVaiheJulkaisu | undefined {
  const julkaisut = hyvaksymisPaatosVaiheJulkaisut?.filter(isHyvaksymisPaatosVaihePublic);
  if (julkaisut) {
    if (julkaisut.length > 1) {
      throw new Error("Bug: vain yksi HyvaksymisPaatosVaiheJulkaisu voi olla julkinen kerrallaan");
    }
    return julkaisut.pop();
  }
}

function isHyvaksymisPaatosVaihePublic(vaihe: HyvaksymisPaatosVaiheJulkaisu): boolean {
  if (!vaihe) {
    return false;
  }
  if (!vaihe.kuulutusPaiva || parseDate(vaihe.kuulutusPaiva).isAfter(dayjs())) {
    return false;
  }
  return vaihe.tila === API.HyvaksymisPaatosVaiheTila.HYVAKSYTTY;
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
  projektiPaallikko,
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
              projektiPaallikko,
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
            vuorovaikutusYhteystiedot: adaptAndMergeYhteystiedot(projektiPaallikko, dbProjekti, vuorovaikutus),
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
  projektiPaallikko: Yhteystieto,
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
      esitettavatYhteystiedot: adaptYhteystiedot(projektiPaallikko, vuorovaikutusTilaisuus.esitettavatYhteystiedot),
      __typename: "VuorovaikutusTilaisuus",
    }));
  }
  return vuorovaikutusTilaisuudet as undefined;
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
  if (!nahtavillaoloVaihe.kuulutusPaiva || parseDate(nahtavillaoloVaihe.kuulutusPaiva).isAfter(dayjs())) {
    return false;
  }
  return nahtavillaoloVaihe.tila === API.NahtavillaoloVaiheTila.HYVAKSYTTY;
}

function isKuulutusNahtavillaVaiheOver(
  nahtavillaoloVaihe:
    | NahtavillaoloVaiheJulkaisu
    | NahtavillaoloVaiheJulkaisuJulkinen
    | HyvaksymisPaatosVaiheJulkaisu
    | HyvaksymisPaatosVaiheJulkaisuJulkinen
): boolean {
  return (
    !nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva ||
    parseDate(nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva).isBefore(dayjs())
  );
}

function adaptAndMergeYhteystiedot(
  projektiPaallikko: Yhteystieto,
  dbProjekti: DBProjekti,
  vuorovaikutus: Vuorovaikutus
) {
  let vuorovaikutusYhteystiedot = adaptYhteystiedotFromUsernames(dbProjekti, vuorovaikutus.vuorovaikutusYhteysHenkilot);
  if (!vuorovaikutusYhteystiedot) {
    vuorovaikutusYhteystiedot = [];
  }
  const yhteystiedot = adaptYhteystiedot(projektiPaallikko, vuorovaikutus.esitettavatYhteystiedot);
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
