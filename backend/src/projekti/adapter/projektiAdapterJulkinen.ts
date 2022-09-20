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
  VuorovaikutusPDF,
  VuorovaikutusTilaisuus,
} from "../../database/model";
import * as API from "../../../../common/graphql/apiModel";
import { HyvaksymisPaatosVaiheJulkaisuJulkinen, NahtavillaoloVaiheJulkaisuJulkinen, Status } from "../../../../common/graphql/apiModel";
import pickBy from "lodash/pickBy";
import dayjs, { Dayjs } from "dayjs";
import { fileService } from "../../files/fileService";
import { log } from "../../logger";
import { parseDate } from "../../util/dateUtil";
import { PathTuple, ProjektiPaths } from "../../files/ProjektiPath";
import {
  adaptHankkeenKuvaus,
  adaptKielitiedotByAddingTypename,
  adaptLinkkiByAddingTypename,
  adaptLinkkiListByAddingTypename,
  adaptYhteystiedotByAddingTypename,
  findPublishedAloitusKuulutusJulkaisu,
} from "./common";
import { findJulkaisuWithTila } from "../projektiUtil";
import { applyProjektiJulkinenStatus } from "../status/projektiJulkinenStatusHandler";
import adaptStandardiYhteystiedot from "../../util/adaptStandardiYhteystiedot";

class ProjektiAdapterJulkinen {
  public adaptProjekti(dbProjekti: DBProjekti): API.ProjektiJulkinen | undefined {
    const aloitusKuulutusJulkaisut = this.adaptAloitusKuulutusJulkaisut(
      dbProjekti.oid,
      dbProjekti.kayttoOikeudet,
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

    const nahtavillaoloVaihe = ProjektiAdapterJulkinen.adaptNahtavillaoloVaiheJulkaisu(dbProjekti, projektiHenkilot);
    const hyvaksymisPaatosVaihe = ProjektiAdapterJulkinen.adaptHyvaksymisPaatosVaihe(
      dbProjekti,
      projektiHenkilot,
      dbProjekti.hyvaksymisPaatosVaiheJulkaisut
    );
    const jatkoPaatos1Vaihe = ProjektiAdapterJulkinen.adaptHyvaksymisPaatosVaihe(
      dbProjekti,
      projektiHenkilot,
      dbProjekti.jatkoPaatos1VaiheJulkaisut
    );
    const jatkoPaatos2Vaihe = ProjektiAdapterJulkinen.adaptHyvaksymisPaatosVaihe(
      dbProjekti,
      projektiHenkilot,
      dbProjekti.jatkoPaatos2VaiheJulkaisut
    );

    const projekti: API.ProjektiJulkinen = {
      __typename: "ProjektiJulkinen",
      oid: dbProjekti.oid,
      kielitiedot: adaptKielitiedotByAddingTypename(dbProjekti.kielitiedot),
      velho: adaptVelho(dbProjekti.velho),
      euRahoitus: dbProjekti.euRahoitus,
      suunnitteluVaihe,
      aloitusKuulutusJulkaisut,
      paivitetty: dbProjekti.paivitetty,
      projektiHenkilot: Object.values(projektiHenkilot),
      nahtavillaoloVaihe,
      hyvaksymisPaatosVaihe,
      jatkoPaatos1Vaihe,
      jatkoPaatos2Vaihe,
    };
    const projektiJulkinen: API.ProjektiJulkinen = removeUndefinedFields(projekti);
    applyProjektiJulkinenStatus(projektiJulkinen);
    if (projektiJulkinen.status != Status.EI_JULKAISTU && projektiJulkinen.status != Status.EPAAKTIIVINEN) {
      return projektiJulkinen;
    }
  }

  adaptAloitusKuulutusJulkaisut(
    oid: string,
    kayttoOikeudet: DBVaylaUser[],
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
          yhteystiedot: adaptYhteystiedotByAddingTypename(yhteystiedot),
          velho: adaptVelho(velho),
          suunnitteluSopimus: this.adaptSuunnitteluSopimus(oid, suunnitteluSopimus),
          kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
          aloituskuulutusPDFt: this.adaptJulkaisuPDFPaths(oid, julkaisu.aloituskuulutusPDFt),
          tila: julkaisu.tila,
        },
      ];
    }
    return undefined;
  }

  adaptSuunnitteluSopimus(oid: string, suunnitteluSopimus?: SuunnitteluSopimus | null): API.SuunnitteluSopimus | undefined | null {
    if (suunnitteluSopimus) {
      return {
        __typename: "SuunnitteluSopimus",
        ...suunnitteluSopimus,
        logo: fileService.getPublicPathForProjektiFile(oid, suunnitteluSopimus.logo),
      };
    }
    return suunnitteluSopimus as undefined | null;
  }

  adaptJulkaisuPDFPaths(oid: string, aloitusKuulutusPDFS: LocalizedMap<AloitusKuulutusPDF>): API.AloitusKuulutusPDFt | undefined {
    if (!aloitusKuulutusPDFS) {
      return undefined;
    }

    const result = {};
    for (const kieli in aloitusKuulutusPDFS) {
      result[kieli] = {
        aloituskuulutusPDFPath: fileService.getPublicPathForProjektiFile(oid, aloitusKuulutusPDFS[kieli].aloituskuulutusPDFPath),
        aloituskuulutusIlmoitusPDFPath: fileService.getPublicPathForProjektiFile(
          oid,
          aloitusKuulutusPDFS[kieli].aloituskuulutusIlmoitusPDFPath
        ),
      } as AloitusKuulutusPDF;
    }
    return { __typename: "AloitusKuulutusPDFt", SUOMI: result[API.Kieli.SUOMI], ...result };
  }

  private static adaptSuunnitteluVaihe(dbProjekti: DBProjekti, projektiHenkilot: ProjektiHenkilot): API.SuunnitteluVaiheJulkinen {
    const { hankkeenKuvaus, arvioSeuraavanVaiheenAlkamisesta, suunnittelunEteneminenJaKesto } = dbProjekti.suunnitteluVaihe;
    return {
      __typename: "SuunnitteluVaiheJulkinen",
      hankkeenKuvaus: adaptHankkeenKuvaus(hankkeenKuvaus),
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      vuorovaikutukset: adaptVuorovaikutukset(dbProjekti, projektiHenkilot),
    };
  }

  private static adaptNahtavillaoloVaiheJulkaisu(
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
        kielitiedot,
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
        kuulutusYhteystiedot: adaptYhteystiedotByAddingTypename(kuulutusYhteystiedot),
        velho: adaptVelho(velho),
        kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
      };
    }
  }

  private static adaptHyvaksymisPaatosVaihe(
    dbProjekti: DBProjekti,
    projektiHenkilot: ProjektiHenkilot,
    paatosVaiheJulkaisut: HyvaksymisPaatosVaiheJulkaisu[]
  ): API.HyvaksymisPaatosVaiheJulkaisuJulkinen {
    const julkaisu = findApprovedHyvaksymisPaatosVaihe(paatosVaiheJulkaisut);
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
        hyvaksymisPaatoksenPvm: hyvaksymispaatos?.paatoksenPvm,
        hyvaksymisPaatoksenAsianumero: hyvaksymispaatos?.asianumero,
        aineistoNahtavilla: apiAineistoNahtavilla,
        kuulutusPaiva,
        kuulutusVaihePaattyyPaiva,
        kuulutusYhteysHenkilot: adaptUsernamesToProjektiHenkiloIds(kuulutusYhteysHenkilot, projektiHenkilot),
        kuulutusYhteystiedot: adaptYhteystiedotByAddingTypename(kuulutusYhteystiedot),
        velho: adaptVelho(velho),
        kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
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

function findApprovedHyvaksymisPaatosVaihe(
  hyvaksymisPaatosVaiheJulkaisut: HyvaksymisPaatosVaiheJulkaisu[]
): HyvaksymisPaatosVaiheJulkaisu | undefined {
  const julkaisut = hyvaksymisPaatosVaiheJulkaisut?.filter(isHyvaksymisPaatosVaihePublic);
  if (julkaisut) {
    if (julkaisut.length > 1) {
      throw new Error("Bug: löytyi liian monta julkaisua");
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

function adaptVuorovaikutukset(dbProjekti: DBProjekti, projektiHenkilot: ProjektiHenkilot): API.VuorovaikutusJulkinen[] {
  const vuorovaikutukset = dbProjekti.vuorovaikutukset;
  if (vuorovaikutukset && vuorovaikutukset.length > 0) {
    return vuorovaikutukset
      .map((vuorovaikutus) => {
        const julkaisuPaiva = parseDate(vuorovaikutus.vuorovaikutusJulkaisuPaiva);
        if (julkaisuPaiva.isBefore(dayjs())) {
          return {
            __typename: "VuorovaikutusJulkinen",
            vuorovaikutusNumero: vuorovaikutus.vuorovaikutusNumero,
            vuorovaikutusJulkaisuPaiva: vuorovaikutus.vuorovaikutusJulkaisuPaiva,
            kysymyksetJaPalautteetViimeistaan: vuorovaikutus.kysymyksetJaPalautteetViimeistaan,
            vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudet(vuorovaikutus.vuorovaikutusTilaisuudet, projektiHenkilot),
            videot: adaptLinkkiListByAddingTypename(vuorovaikutus.videot),
            suunnittelumateriaali: adaptLinkkiByAddingTypename(vuorovaikutus.suunnittelumateriaali),
            esittelyaineistot: adaptAineistotJulkinen(dbProjekti.oid, vuorovaikutus.esittelyaineistot, undefined, julkaisuPaiva),
            suunnitelmaluonnokset: adaptAineistotJulkinen(dbProjekti.oid, vuorovaikutus.suunnitelmaluonnokset, undefined, julkaisuPaiva),
            yhteystiedot: adaptStandardiYhteystiedot(dbProjekti, vuorovaikutus.esitettavatYhteystiedot),
            vuorovaikutusPDFt: adaptVuorovaikutusPDFPaths(dbProjekti.oid, vuorovaikutus.vuorovaikutusPDFt),
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
): API.VuorovaikutusTilaisuus[] {
  if (vuorovaikutusTilaisuudet) {
    return vuorovaikutusTilaisuudet.map((vuorovaikutusTilaisuus) => ({
      ...vuorovaikutusTilaisuus,
      projektiYhteysHenkilot: adaptUsernamesToProjektiHenkiloIds(vuorovaikutusTilaisuus.projektiYhteysHenkilot, projektiHenkilot),
      esitettavatYhteystiedot: adaptYhteystiedotByAddingTypename(vuorovaikutusTilaisuus.esitettavatYhteystiedot),
      __typename: "VuorovaikutusTilaisuus",
    }));
  }
  return vuorovaikutusTilaisuudet as undefined;
}

function checkIfAloitusKuulutusJulkaisutIsPublic(aloitusKuulutusJulkaisut: API.AloitusKuulutusJulkaisuJulkinen[]): boolean {
  if (!(aloitusKuulutusJulkaisut && aloitusKuulutusJulkaisut.length == 1)) {
    log.info("Projektilla ei ole hyväksyttyä aloituskuulutusta");
    return false;
  }

  const hyvaksyttyJulkaisu = findJulkaisuWithTila(aloitusKuulutusJulkaisut, API.AloitusKuulutusTila.HYVAKSYTTY);
  if (hyvaksyttyJulkaisu) {
    if (hyvaksyttyJulkaisu.kuulutusPaiva && parseDate(hyvaksyttyJulkaisu.kuulutusPaiva).isAfter(dayjs())) {
      log.info("Projektin aloituskuulutuksen kuulutuspäivä on tulevaisuudessa", {
        kuulutusPaiva: parseDate(hyvaksyttyJulkaisu.kuulutusPaiva).format(),
        now: dayjs().format(),
      });
      return false;
    }
  } else if (!findJulkaisuWithTila(aloitusKuulutusJulkaisut, API.AloitusKuulutusTila.MIGROITU)) {
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
  return !nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva || parseDate(nahtavillaoloVaihe.kuulutusVaihePaattyyPaiva).isBefore(dayjs());
}

function adaptVuorovaikutusPDFPaths(oid: string, pdfs: LocalizedMap<VuorovaikutusPDF>): API.VuorovaikutusPDFt | undefined {
  if (!pdfs) {
    return undefined;
  }

  const result: { [Kieli: string]: API.VuorovaikutusPDF } = {};
  for (const kieli in pdfs) {
    result[kieli] = {
      __typename: "VuorovaikutusPDF",
      kutsuPDFPath: fileService.getPublicPathForProjektiFile(oid, pdfs[kieli].kutsuPDFPath),
    };
  }
  return { __typename: "VuorovaikutusPDFt", SUOMI: result[API.Kieli.SUOMI], ...result };
}

function removeUndefinedFields(object: API.ProjektiJulkinen): API.ProjektiJulkinen {
  return { __typename: "ProjektiJulkinen", oid: object.oid, velho: object.velho, ...pickBy(object, (value) => value !== undefined) };
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
