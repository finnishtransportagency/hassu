import {
  Aineisto,
  AloitusKuulutusJulkaisu,
  AloitusKuulutusPDF,
  DBProjekti,
  DBVaylaUser,
  Hyvaksymispaatos,
  HyvaksymisPaatosVaiheJulkaisu,
  LocalizedMap,
  NahtavillaoloVaiheJulkaisu,
  StandardiYhteystiedot,
  Velho,
  Vuorovaikutus,
  VuorovaikutusPDF,
  VuorovaikutusTilaisuus,
} from "../../database/model";
import * as API from "../../../../common/graphql/apiModel";
import {
  KuulutusJulkaisuTila,
  HyvaksymisPaatosVaiheJulkaisuJulkinen,
  NahtavillaoloVaiheJulkaisuJulkinen,
  Status,
  SuunnitteluVaiheTila,
} from "../../../../common/graphql/apiModel";
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
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptYhteystiedotByAddingTypename,
  findPublishedAloitusKuulutusJulkaisu,
} from "./common";
import { findJulkaisuWithTila, findUserByKayttajatunnus } from "../projektiUtil";
import { applyProjektiJulkinenStatus } from "../status/projektiJulkinenStatusHandler";
import {
  adaptStandardiYhteystiedotLisaamattaProjaria,
  adaptStandardiYhteystiedotToAPIYhteystiedot,
} from "../../util/adaptStandardiYhteystiedot";
import {
  adaptSuunnitteluSopimusJulkaisu,
  adaptSuunnitteluSopimusJulkaisuJulkinen,
  adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu,
  adaptUudelleenKuulutus,
  FileLocation,
} from "./adaptToAPI";
import { cloneDeep } from "lodash";
import { kuntametadata } from "../../../../common/kuntametadata";

class ProjektiAdapterJulkinen {
  public adaptProjekti(dbProjekti: DBProjekti): API.ProjektiJulkinen | undefined {
    if (!dbProjekti.velho) {
      throw new Error("adaptProjekti: dbProjekti.velho määrittelemättä");
    }
    const aloitusKuulutusJulkaisu = this.adaptAloitusKuulutusJulkaisu(dbProjekti.oid, dbProjekti.aloitusKuulutusJulkaisut);

    if (!checkIfAloitusKuulutusJulkaisutIsPublic(aloitusKuulutusJulkaisu)) {
      return undefined;
    }

    const projektiHenkilot: API.ProjektiKayttajaJulkinen[] = adaptProjektiHenkilot(
      dbProjekti.kayttoOikeudet,
      dbProjekti.suunnitteluSopimus?.yhteysHenkilo
    );

    let suunnitteluVaihe = undefined;
    if (
      dbProjekti.suunnitteluVaihe?.tila == SuunnitteluVaiheTila.JULKINEN ||
      dbProjekti.suunnitteluVaihe?.tila == SuunnitteluVaiheTila.MIGROITU
    ) {
      suunnitteluVaihe = ProjektiAdapterJulkinen.adaptSuunnitteluVaihe(dbProjekti);
    }

    const nahtavillaoloVaihe = ProjektiAdapterJulkinen.adaptNahtavillaoloVaiheJulkaisu(dbProjekti);
    const suunnitteluSopimus = adaptRootSuunnitteluSopimusJulkaisu(dbProjekti);
    const hyvaksymisPaatosVaihe = ProjektiAdapterJulkinen.adaptHyvaksymisPaatosVaihe(
      dbProjekti,
      dbProjekti.hyvaksymisPaatosVaiheJulkaisut,
      dbProjekti.kasittelynTila?.hyvaksymispaatos
    );
    const jatkoPaatos1Vaihe = ProjektiAdapterJulkinen.adaptHyvaksymisPaatosVaihe(
      dbProjekti,
      dbProjekti.jatkoPaatos1VaiheJulkaisut,
      dbProjekti.kasittelynTila?.ensimmainenJatkopaatos
    );
    const jatkoPaatos2Vaihe = ProjektiAdapterJulkinen.adaptHyvaksymisPaatosVaihe(
      dbProjekti,
      dbProjekti.jatkoPaatos2VaiheJulkaisut,
      dbProjekti.kasittelynTila?.toinenJatkopaatos
    );

    const projekti: API.ProjektiJulkinen = {
      __typename: "ProjektiJulkinen",
      oid: dbProjekti.oid,
      kielitiedot: adaptKielitiedotByAddingTypename(dbProjekti.kielitiedot),
      velho: adaptVelho(dbProjekti.velho),
      euRahoitus: dbProjekti.euRahoitus,
      suunnitteluVaihe,
      suunnitteluSopimus,
      aloitusKuulutusJulkaisu,
      paivitetty: dbProjekti.paivitetty,
      projektiHenkilot: Object.values(projektiHenkilot),
      nahtavillaoloVaihe,
      hyvaksymisPaatosVaihe,
      jatkoPaatos1Vaihe,
      jatkoPaatos2Vaihe,
    };
    const projektiJulkinen: API.ProjektiJulkinen = removeUndefinedFields(projekti);
    applyProjektiJulkinenStatus(projektiJulkinen);
    if (!projektiJulkinen.status || this.isStatusPublic(projektiJulkinen.status)) {
      return projektiJulkinen;
    }
  }

  private isStatusPublic(status: Status) {
    const notPublicStatuses = [Status.EI_JULKAISTU, Status.EPAAKTIIVINEN_1, Status.EPAAKTIIVINEN_2, Status.EPAAKTIIVINEN_3];
    return !notPublicStatuses.includes(status);
  }

  adaptAloitusKuulutusJulkaisu(
    oid: string,
    aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null
  ): API.AloitusKuulutusJulkaisuJulkinen | undefined {
    if (aloitusKuulutusJulkaisut) {
      const migroitu = findJulkaisuWithTila(aloitusKuulutusJulkaisut, API.KuulutusJulkaisuTila.MIGROITU);
      if (migroitu) {
        return {
          __typename: "AloitusKuulutusJulkaisuJulkinen",
          tila: KuulutusJulkaisuTila.MIGROITU,
          yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(migroitu.yhteystiedot),
          velho: adaptVelho(migroitu.velho),
        };
      }
      // Pick HYVAKSYTTY or MIGROITU aloituskuulutusjulkaisu, by this order
      const julkaisu = findPublishedAloitusKuulutusJulkaisu(aloitusKuulutusJulkaisut);
      if (!julkaisu) {
        return undefined;
      }
      const { yhteystiedot, velho, suunnitteluSopimus, kielitiedot, tila, kuulutusPaiva, uudelleenKuulutus } = julkaisu;
      if (!julkaisu.hankkeenKuvaus) {
        throw new Error("adaptAloitusKuulutusJulkaisut: julkaisu.hankkeenKuvaus määrittelemättä");
      }

      return {
        __typename: "AloitusKuulutusJulkaisuJulkinen",
        kuulutusPaiva,
        siirtyySuunnitteluVaiheeseen: julkaisu.siirtyySuunnitteluVaiheeseen,
        hankkeenKuvaus: adaptHankkeenKuvaus(julkaisu.hankkeenKuvaus),
        yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
        velho: adaptVelho(velho),
        suunnitteluSopimus: adaptSuunnitteluSopimusJulkaisuJulkinen(oid, suunnitteluSopimus),
        kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
        aloituskuulutusPDFt: this.adaptJulkaisuPDFPaths(oid, julkaisu.aloituskuulutusPDFt),
        tila,
        uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
      };
    }
    return undefined;
  }

  adaptJulkaisuPDFPaths(
    oid: string,
    aloitusKuulutusPDFS: LocalizedMap<AloitusKuulutusPDF> | null | undefined
  ): API.AloitusKuulutusPDFt | undefined {
    if (!aloitusKuulutusPDFS) {
      return undefined;
    }

    if (!aloitusKuulutusPDFS[API.Kieli.SUOMI]) {
      throw new Error(`adaptJulkaisuPDFPaths: aloitusKuulutusPDFS.${API.Kieli.SUOMI} määrittelemättä`);
    }

    const result: Partial<API.AloitusKuulutusPDFt> = {};
    for (const kieli in aloitusKuulutusPDFS) {
      const pdfs = aloitusKuulutusPDFS[kieli as API.Kieli];
      if (pdfs) {
        result[kieli as API.Kieli] = {
          __typename: "AloitusKuulutusPDF",
          aloituskuulutusPDFPath: fileService.getPublicPathForProjektiFile(oid, pdfs.aloituskuulutusPDFPath),
          aloituskuulutusIlmoitusPDFPath: fileService.getPublicPathForProjektiFile(oid, pdfs.aloituskuulutusIlmoitusPDFPath),
        };
      }
    }
    return { __typename: "AloitusKuulutusPDFt", [API.Kieli.SUOMI]: result[API.Kieli.SUOMI] as API.AloitusKuulutusPDF, ...result };
  }

  private static adaptSuunnitteluVaihe(dbProjekti: DBProjekti): API.SuunnitteluVaiheJulkinen | undefined {
    if (!dbProjekti.suunnitteluVaihe) {
      return undefined;
    }
    const { hankkeenKuvaus, arvioSeuraavanVaiheenAlkamisesta, suunnittelunEteneminenJaKesto, tila } = dbProjekti.suunnitteluVaihe;
    if (tila == SuunnitteluVaiheTila.MIGROITU) {
      return { __typename: "SuunnitteluVaiheJulkinen", tila: SuunnitteluVaiheTila.MIGROITU };
    }
    if (!hankkeenKuvaus) {
      throw new Error("adaptSuunnitteluVaihe: suunnitteluvaihe.hankkeenKuvaus määrittelemättä");
    }
    return {
      __typename: "SuunnitteluVaiheJulkinen",
      hankkeenKuvaus: adaptHankkeenKuvaus(hankkeenKuvaus),
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      vuorovaikutukset: adaptVuorovaikutukset(dbProjekti),
    };
  }

  private static adaptNahtavillaoloVaiheJulkaisu(dbProjekti: DBProjekti): API.NahtavillaoloVaiheJulkaisuJulkinen | undefined {
    if (!dbProjekti.nahtavillaoloVaiheJulkaisut) {
      return undefined;
    }
    const julkaisu = pickExactlyOneNahtavillaoloVaiheJulkaisu(dbProjekti.nahtavillaoloVaiheJulkaisut);
    if (julkaisu) {
      const {
        aineistoNahtavilla,
        hankkeenKuvaus,
        kuulutusPaiva,
        kuulutusVaihePaattyyPaiva,
        yhteystiedot,
        muistutusoikeusPaattyyPaiva,
        velho,
        kielitiedot,
        tila,
      } = julkaisu;

      if (julkaisu?.tila == KuulutusJulkaisuTila.MIGROITU) {
        return {
          __typename: "NahtavillaoloVaiheJulkaisuJulkinen",
          tila: julkaisu.tila,
          velho: adaptVelho(velho),
          yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
        };
      }

      const paths = new ProjektiPaths(dbProjekti.oid).nahtavillaoloVaihe(julkaisu);

      if (!aineistoNahtavilla) {
        throw new Error("adaptNahtavillaoloVaiheJulkaisu: julkaisu.aineistoNahtavilla määrittelemättä");
      }
      if (!yhteystiedot) {
        throw new Error("adaptNahtavillaoloVaiheJulkaisu: julkaisu.yhteystiedot määrittelemättä");
      }
      if (!hankkeenKuvaus) {
        throw new Error("adaptNahtavillaoloVaiheJulkaisu: julkaisu.hankkeenKuvaus määrittelemättä");
      }

      let apiAineistoNahtavilla: API.Aineisto[] | undefined = undefined;
      if (!isKuulutusNahtavillaVaiheOver(julkaisu)) {
        apiAineistoNahtavilla = adaptAineistotJulkinen(dbProjekti.oid, aineistoNahtavilla, paths);
      }

      const julkaisuJulkinen: API.NahtavillaoloVaiheJulkaisuJulkinen = {
        __typename: "NahtavillaoloVaiheJulkaisuJulkinen",
        hankkeenKuvaus: adaptHankkeenKuvaus(hankkeenKuvaus),
        kuulutusPaiva,
        kuulutusVaihePaattyyPaiva,
        muistutusoikeusPaattyyPaiva,
        yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
        velho: adaptVelho(velho),
        kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
        tila,
      };
      if (apiAineistoNahtavilla) {
        julkaisuJulkinen.aineistoNahtavilla = apiAineistoNahtavilla;
      }
      return julkaisuJulkinen;
    }
  }

  private static adaptHyvaksymisPaatosVaihe(
    dbProjekti: DBProjekti,
    paatosVaiheJulkaisut: HyvaksymisPaatosVaiheJulkaisu[] | undefined | null,
    hyvaksymispaatos: Hyvaksymispaatos | undefined | null
  ): API.HyvaksymisPaatosVaiheJulkaisuJulkinen | undefined {
    const julkaisu = findApprovedHyvaksymisPaatosVaihe(paatosVaiheJulkaisut);
    if (julkaisu) {
      const {
        hyvaksymisPaatos,
        aineistoNahtavilla,
        kuulutusPaiva,
        kuulutusVaihePaattyyPaiva,
        yhteystiedot,
        velho,
        kielitiedot,
        hallintoOikeus,
        tila,
      } = julkaisu;

      if (tila == KuulutusJulkaisuTila.MIGROITU) {
        return { __typename: "HyvaksymisPaatosVaiheJulkaisuJulkinen", tila, velho: adaptVelho(velho) };
      }

      if (!hyvaksymispaatos) {
        throw new Error("adaptHyvaksymisPaatosVaihe: dbProjekti.kasittelynTila?.hyvaksymispaatos määrittelemättä");
      }
      if (!hyvaksymispaatos.paatoksenPvm) {
        throw new Error("adaptHyvaksymisPaatosVaihe: dbProjekti.kasittelynTila?.hyvaksymispaatos.paatoksenPvm määrittelemättä");
      }
      if (!hyvaksymispaatos.asianumero) {
        throw new Error("adaptHyvaksymisPaatosVaihe: dbProjekti.kasittelynTila?.hyvaksymispaatos.asianumero määrittelemättä");
      }
      if (!hyvaksymisPaatos) {
        throw new Error("adaptHyvaksymisPaatosVaihe: julkaisu.hyvaksymisPaatos määrittelemättä");
      }
      if (!yhteystiedot) {
        throw new Error("adaptHyvaksymisPaatosVaihe: julkaisu.yhteystiedot määrittelemättä");
      }
      const paths = new ProjektiPaths(dbProjekti.oid).hyvaksymisPaatosVaihe(julkaisu);

      let apiHyvaksymisPaatosAineisto: API.Aineisto[] | undefined = undefined;
      let apiAineistoNahtavilla: API.Aineisto[] | undefined = undefined;
      if (!isKuulutusNahtavillaVaiheOver(julkaisu)) {
        apiHyvaksymisPaatosAineisto = adaptAineistotJulkinen(dbProjekti.oid, hyvaksymisPaatos, paths);
        apiAineistoNahtavilla = adaptAineistotJulkinen(dbProjekti.oid, aineistoNahtavilla, paths);
      }
      return {
        __typename: "HyvaksymisPaatosVaiheJulkaisuJulkinen",
        hyvaksymisPaatos: apiHyvaksymisPaatosAineisto,
        hyvaksymisPaatoksenPvm: hyvaksymispaatos.paatoksenPvm,
        hyvaksymisPaatoksenAsianumero: hyvaksymispaatos.asianumero,
        aineistoNahtavilla: apiAineistoNahtavilla,
        kuulutusPaiva,
        kuulutusVaihePaattyyPaiva,
        yhteystiedot: adaptYhteystiedotByAddingTypename(yhteystiedot),
        velho: adaptVelho(velho),
        kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
        hallintoOikeus,
        tila,
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
  hyvaksymisPaatosVaiheJulkaisut: HyvaksymisPaatosVaiheJulkaisu[] | undefined | null
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
  if (vaihe.tila == KuulutusJulkaisuTila.MIGROITU) {
    return true;
  }
  if (!vaihe.kuulutusPaiva || parseDate(vaihe.kuulutusPaiva).isAfter(dayjs())) {
    return false;
  }
  return vaihe.tila === API.KuulutusJulkaisuTila.HYVAKSYTTY;
}

function isUnsetOrInPast(julkaisuPaiva?: dayjs.Dayjs) {
  return !julkaisuPaiva || julkaisuPaiva.isBefore(dayjs());
}

/**
 *
 * @param oid
 * @param aineistot
 * @param paths
 * @param julkaisuPaiva Jos ei asetettu, aineistolla ei ole ajastettua julkaisua, joten se on aina julkista
 */
function adaptAineistotJulkinen(
  oid: string,
  aineistot: Aineisto[] | null | undefined,
  paths: PathTuple | undefined,
  julkaisuPaiva?: Dayjs
): API.Aineisto[] | undefined {
  if (isUnsetOrInPast(julkaisuPaiva) && aineistot && aineistot.length > 0) {
    return aineistot
      .filter((aineisto) => aineisto.tila == API.AineistoTila.VALMIS && aineisto.tiedosto)
      .map((aineisto) => {
        if (!aineisto.tiedosto) {
          throw new Error("adaptAineistotJulkinen: aineisto.tiedosto määrittelemättä");
        }
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

function adaptVuorovaikutukset(dbProjekti: DBProjekti): API.VuorovaikutusJulkinen[] | undefined {
  const vuorovaikutukset = dbProjekti.vuorovaikutukset;
  if (vuorovaikutukset && vuorovaikutukset.length > 0) {
    const julkaistutVuorovaikutukset: Vuorovaikutus[] = vuorovaikutukset.filter(
      (v) => v.vuorovaikutusJulkaisuPaiva && parseDate(v.vuorovaikutusJulkaisuPaiva).isBefore(dayjs()) && v.julkinen
    );

    return julkaistutVuorovaikutukset.map((vuorovaikutus) => {
      if (!vuorovaikutus.vuorovaikutusTilaisuudet) {
        throw new Error("adaptVuorovaikutukset: vuorovaikutus.vuorovaikutusTilaisuudet määrittelmättä");
      }
      // tarkistettu jo, että vuorovaikutusJulkaisuPaiva määritelty
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const julkaisuPaiva = parseDate(vuorovaikutus.vuorovaikutusJulkaisuPaiva);
      const vuorovaikutusJulkinen: API.VuorovaikutusJulkinen = {
        __typename: "VuorovaikutusJulkinen",
        vuorovaikutusNumero: vuorovaikutus.vuorovaikutusNumero,
        vuorovaikutusJulkaisuPaiva: vuorovaikutus.vuorovaikutusJulkaisuPaiva,
        kysymyksetJaPalautteetViimeistaan: vuorovaikutus.kysymyksetJaPalautteetViimeistaan,
        vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudet(vuorovaikutus.vuorovaikutusTilaisuudet, dbProjekti),
        videot: adaptLinkkiListByAddingTypename(vuorovaikutus.videot),
        suunnittelumateriaali: adaptLinkkiByAddingTypename(vuorovaikutus.suunnittelumateriaali),
        esittelyaineistot: adaptAineistotJulkinen(dbProjekti.oid, vuorovaikutus.esittelyaineistot, undefined, julkaisuPaiva),
        suunnitelmaluonnokset: adaptAineistotJulkinen(dbProjekti.oid, vuorovaikutus.suunnitelmaluonnokset, undefined, julkaisuPaiva),
        yhteystiedot: adaptStandardiYhteystiedotToAPIYhteystiedot(dbProjekti, vuorovaikutus.esitettavatYhteystiedot, true),
        vuorovaikutusPDFt: adaptVuorovaikutusPDFPaths(dbProjekti.oid, vuorovaikutus.vuorovaikutusPDFt),
      };
      return vuorovaikutusJulkinen;
    });
  }
  return vuorovaikutukset as undefined;
}

function adaptVuorovaikutusTilaisuudet(
  vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuus>,
  dbProjekti: DBProjekti
): API.VuorovaikutusTilaisuusJulkinen[] {
  const vuorovaikutusTilaisuudetCopy = cloneDeep(vuorovaikutusTilaisuudet);
  return vuorovaikutusTilaisuudetCopy.map((vuorovaikutusTilaisuus) => {
    const esitettavatYhteystiedot: StandardiYhteystiedot | undefined = vuorovaikutusTilaisuus.esitettavatYhteystiedot;
    delete vuorovaikutusTilaisuus.esitettavatYhteystiedot;
    const tilaisuus: API.VuorovaikutusTilaisuusJulkinen = {
      __typename: "VuorovaikutusTilaisuusJulkinen",
      ...vuorovaikutusTilaisuus,
    };
    if (vuorovaikutusTilaisuus.tyyppi === API.VuorovaikutusTilaisuusTyyppi.SOITTOAIKA) {
      if (!esitettavatYhteystiedot) {
        throw new Error("adaptVuorovaikutusTilaisuudet: vuorovaikutusTilaisuus.esitettavatYhteystiedot määrittelmättä");
      }
      tilaisuus.yhteystiedot = adaptStandardiYhteystiedotLisaamattaProjaria(dbProjekti, esitettavatYhteystiedot);
    }

    return tilaisuus;
  });
}

function checkIfAloitusKuulutusJulkaisutIsPublic(aloitusKuulutusJulkaisu: API.AloitusKuulutusJulkaisuJulkinen | null | undefined): boolean {
  if (!aloitusKuulutusJulkaisu) {
    log.info("Projektilla ei ole hyväksyttyä aloituskuulutusta");
    return false;
  }

  if (aloitusKuulutusJulkaisu.tila == API.KuulutusJulkaisuTila.HYVAKSYTTY) {
    if (aloitusKuulutusJulkaisu.kuulutusPaiva && parseDate(aloitusKuulutusJulkaisu.kuulutusPaiva).isAfter(dayjs())) {
      log.info("Projektin aloituskuulutuksen kuulutuspäivä on tulevaisuudessa", {
        kuulutusPaiva: parseDate(aloitusKuulutusJulkaisu.kuulutusPaiva).format(),
        now: dayjs().format(),
      });
      return false;
    }
  } else if (aloitusKuulutusJulkaisu.tila !== API.KuulutusJulkaisuTila.MIGROITU) {
    // If there are no HYVAKSYTTY or MIGROITU aloitusKuulutusJulkaisu, hide projekti
    return false;
  }
  return true;
}

function isNahtavillaoloVaihePublic(nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu): boolean {
  if (!nahtavillaoloVaihe) {
    return false;
  }
  if (nahtavillaoloVaihe.tila == KuulutusJulkaisuTila.MIGROITU) {
    return true;
  }
  if (!nahtavillaoloVaihe.kuulutusPaiva || parseDate(nahtavillaoloVaihe.kuulutusPaiva).isAfter(dayjs())) {
    return false;
  }
  return nahtavillaoloVaihe.tila === API.KuulutusJulkaisuTila.HYVAKSYTTY;
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

function adaptVuorovaikutusPDFPaths(
  oid: string,
  vuorovaikutuspdfs: LocalizedMap<VuorovaikutusPDF> | undefined
): API.VuorovaikutusPDFt | undefined {
  if (!vuorovaikutuspdfs) {
    return undefined;
  }
  const result: Partial<API.VuorovaikutusPDFt> = {};
  if (vuorovaikutuspdfs && !vuorovaikutuspdfs[API.Kieli.SUOMI]) {
    throw new Error(`adaptVuorovaikutusPDFPaths: vuorovaikutuspdfs.${API.Kieli.SUOMI} määrittelemättä`);
  }
  for (const kieli in vuorovaikutuspdfs) {
    const pdfs = vuorovaikutuspdfs[kieli as API.Kieli];
    if (pdfs) {
      result[kieli as API.Kieli] = {
        __typename: "VuorovaikutusPDF",
        kutsuPDFPath: fileService.getPublicPathForProjektiFile(oid, pdfs.kutsuPDFPath),
      };
    }
  }
  return { __typename: "VuorovaikutusPDFt", [API.Kieli.SUOMI]: result[API.Kieli.SUOMI] as API.VuorovaikutusPDF, ...result };
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
    kunnat: kunnat?.map(kuntametadata.idForKuntaName),
    maakunnat: maakunnat?.map(kuntametadata.idForMaakuntaName),
    suunnittelustaVastaavaViranomainen,
    vaylamuoto,
    asiatunnusVayla,
    asiatunnusELY,
    kuvaus,
    toteuttavaOrganisaatio,
  };
}

function adaptProjektiHenkilot(
  kayttoOikeudet: DBVaylaUser[],
  suunnitteluSopimuksenKayttajaTunnus: string | undefined
): API.ProjektiKayttajaJulkinen[] {
  return kayttoOikeudet
    ?.filter((kayttoOikeus) => kayttoOikeus.tyyppi === API.KayttajaTyyppi.PROJEKTIPAALLIKKO || !!kayttoOikeus.yleinenYhteystieto)
    ?.filter((kayttoOikeus) => kayttoOikeus.kayttajatunnus !== suunnitteluSopimuksenKayttajaTunnus)
    ?.map((kayttoOikeus) => {
      const result: API.ProjektiKayttajaJulkinen = {
        __typename: "ProjektiKayttajaJulkinen",
        etunimi: kayttoOikeus.etunimi,
        sukunimi: kayttoOikeus.sukunimi,
        email: kayttoOikeus.email,
        puhelinnumero: kayttoOikeus.puhelinnumero,
        organisaatio: kayttoOikeus.organisaatio,
        projektiPaallikko: kayttoOikeus.tyyppi === API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
      };
      return result;
    })
    ?.sort(sortByProjektiPaallikko);
}

function adaptRootSuunnitteluSopimusJulkaisu(dbProjekti: DBProjekti) {
  const yhteysHenkilo = findUserByKayttajatunnus(dbProjekti.kayttoOikeudet, dbProjekti.suunnitteluSopimus?.yhteysHenkilo);
  const suunnittelusopimusJulkaisu = adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu(dbProjekti.suunnitteluSopimus, yhteysHenkilo);
  return adaptSuunnitteluSopimusJulkaisu(dbProjekti.oid, suunnittelusopimusJulkaisu, FileLocation.PUBLIC);
}

type ProjektiKayttajaJulkinenSortFunction = (a: API.ProjektiKayttajaJulkinen, b: API.ProjektiKayttajaJulkinen) => number;
const sortByProjektiPaallikko: ProjektiKayttajaJulkinenSortFunction = (a, b) => {
  // a is projektipaallikko and b is not thus a is put before b
  if (a.projektiPaallikko && !b.projektiPaallikko) {
    return -1;
  }
  // b is projektipaallikko and a is not thus b is put before a
  if (!a.projektiPaallikko && b.projektiPaallikko) {
    return 1;
  }
  // a and b are equal
  return 0;
};

export const projektiAdapterJulkinen = new ProjektiAdapterJulkinen();
