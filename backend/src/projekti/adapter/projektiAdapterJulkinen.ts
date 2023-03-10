import {
  Aineisto,
  AloitusKuulutusJulkaisu,
  DBProjekti,
  DBVaylaUser,
  Hyvaksymispaatos,
  HyvaksymisPaatosVaiheJulkaisu,
  LocalizedMap,
  NahtavillaoloVaiheJulkaisu,
  UudelleenKuulutus,
  Velho,
  VuorovaikutusKierrosJulkaisu,
  VuorovaikutusTilaisuusJulkaisu,
  Yhteystieto,
} from "../../database/model";
import * as API from "../../../../common/graphql/apiModel";
import { Kieli, KuulutusJulkaisuTila, ProjektiJulkinen, Status } from "../../../../common/graphql/apiModel";
import pickBy from "lodash/pickBy";
import dayjs, { Dayjs } from "dayjs";
import { fileService } from "../../files/fileService";
import { parseDate } from "../../util/dateUtil";
import { PathTuple, ProjektiPaths } from "../../files/ProjektiPath";
import {
  adaptKielitiedotByAddingTypename,
  adaptLokalisoituLinkki,
  adaptLokalisoituTeksti,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptYhteystiedotByAddingTypename,
  findPublishedKuulutusJulkaisu,
} from "./common";
import { findUserByKayttajatunnus } from "../projektiUtil";
import { applyProjektiJulkinenStatus } from "../status/projektiJulkinenStatusHandler";
import {
  adaptEuRahoitusLogotJulkinen,
  adaptLokalisoituTeksti as adaptPakotettuLokalisoituTeksti,
  adaptSuunnitteluSopimusJulkaisu,
  adaptSuunnitteluSopimusJulkaisuJulkinen,
  adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisu,
  FileLocation,
} from "./adaptToAPI";
import cloneDeep from "lodash/cloneDeep";
import { kuntametadata } from "../../../../common/kuntametadata";
import { AloituskuulutusKutsuAdapter, createAloituskuulutusKutsuAdapterProps } from "../../asiakirja/adapter/aloituskuulutusKutsuAdapter";
import {
  createNahtavillaoloVaiheKutsuAdapterProps,
  NahtavillaoloVaiheKutsuAdapter,
} from "../../asiakirja/adapter/nahtavillaoloVaiheKutsuAdapter";
import {
  createHyvaksymisPaatosVaiheKutsuAdapterProps,
  HyvaksymisPaatosVaiheKutsuAdapter,
} from "../../asiakirja/adapter/hyvaksymisPaatosVaiheKutsuAdapter";
import { assertIsDefined } from "../../util/assertions";
import {
  HyvaksymisPaatosVaiheAineisto,
  isVerkkotilaisuusLinkkiVisible,
  ProjektiAineistoManager,
} from "../../aineisto/projektiAineistoManager";

class ProjektiAdapterJulkinen {
  public async adaptProjekti(dbProjekti: DBProjekti, kieli?: Kieli): Promise<ProjektiJulkinen | undefined> {
    if (!dbProjekti.velho) {
      throw new Error("adaptProjekti: dbProjekti.velho määrittelemättä");
    }
    const aloitusKuulutusJulkaisu = await this.adaptAloitusKuulutusJulkaisu(dbProjekti, dbProjekti.aloitusKuulutusJulkaisut, kieli);

    if (!aloitusKuulutusJulkaisu) {
      return undefined;
    }

    const projektiHenkilot: API.ProjektiKayttajaJulkinen[] = adaptProjektiHenkilot(
      dbProjekti.kayttoOikeudet,
      dbProjekti.suunnitteluSopimus?.yhteysHenkilo
    );

    let vuorovaikutusKierrokset = undefined;
    if (
      dbProjekti.vuorovaikutusKierros?.tila == API.VuorovaikutusKierrosTila.JULKINEN ||
      dbProjekti.vuorovaikutusKierros?.tila == API.VuorovaikutusKierrosTila.MIGROITU
    ) {
      vuorovaikutusKierrokset = ProjektiAdapterJulkinen.adaptVuorovaikutusKierrokset(dbProjekti);
    }

    const nahtavillaoloVaihe = await ProjektiAdapterJulkinen.adaptNahtavillaoloVaiheJulkaisu(dbProjekti, kieli);
    const suunnitteluSopimus = adaptRootSuunnitteluSopimusJulkaisu(dbProjekti);
    const euRahoitusLogot = adaptEuRahoitusLogotJulkinen(dbProjekti.oid, dbProjekti.euRahoitusLogot);
    const projektiAineistoManager = new ProjektiAineistoManager(dbProjekti);
    const hyvaksymisPaatosVaihe = ProjektiAdapterJulkinen.adaptHyvaksymisPaatosVaihe(
      dbProjekti,
      dbProjekti.hyvaksymisPaatosVaiheJulkaisut,
      dbProjekti.kasittelynTila?.hyvaksymispaatos,
      (julkaisu) => new ProjektiPaths(dbProjekti.oid).hyvaksymisPaatosVaihe(julkaisu),
      projektiAineistoManager.getHyvaksymisPaatosVaihe(),
      kieli
    );
    const jatkoPaatos1Vaihe = ProjektiAdapterJulkinen.adaptHyvaksymisPaatosVaihe(
      dbProjekti,
      dbProjekti.jatkoPaatos1VaiheJulkaisut,
      dbProjekti.kasittelynTila?.ensimmainenJatkopaatos,
      (julkaisu) => new ProjektiPaths(dbProjekti.oid).jatkoPaatos1Vaihe(julkaisu),
      projektiAineistoManager.getJatkoPaatos1Vaihe()
    );
    const jatkoPaatos2Vaihe = ProjektiAdapterJulkinen.adaptHyvaksymisPaatosVaihe(
      dbProjekti,
      dbProjekti.jatkoPaatos2VaiheJulkaisut,
      dbProjekti.kasittelynTila?.toinenJatkopaatos,
      (julkaisu) => new ProjektiPaths(dbProjekti.oid).jatkoPaatos2Vaihe(julkaisu),
      projektiAineistoManager.getJatkoPaatos2Vaihe()
    );
    const projekti: API.ProjektiJulkinen = {
      __typename: "ProjektiJulkinen",
      oid: dbProjekti.oid,
      lyhytOsoite: dbProjekti.lyhytOsoite,
      kielitiedot: adaptKielitiedotByAddingTypename(dbProjekti.kielitiedot),
      velho: adaptVelho(dbProjekti.velho),
      euRahoitus: dbProjekti.euRahoitus,
      euRahoitusLogot,
      vahainenMenettely: dbProjekti.vahainenMenettely,
      vuorovaikutusKierrokset,
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

  async adaptAloitusKuulutusJulkaisu(
    projekti: DBProjekti,
    aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null,
    kieli?: Kieli
  ): Promise<API.AloitusKuulutusJulkaisuJulkinen | undefined> {
    const oid = projekti.oid;
    const julkaisu = findPublishedKuulutusJulkaisu(aloitusKuulutusJulkaisut);
    // Pick HYVAKSYTTY or MIGROITU aloituskuulutusjulkaisu, by this order
    if (!julkaisu) {
      return undefined;
    }
    const { yhteystiedot, velho, suunnitteluSopimus, kielitiedot, tila, kuulutusPaiva, uudelleenKuulutus } = julkaisu;
    if (tila === KuulutusJulkaisuTila.MIGROITU) {
      return {
        __typename: "AloitusKuulutusJulkaisuJulkinen",
        tila,
        yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
        velho: adaptVelho(velho),
      };
    }

    if (!julkaisu.hankkeenKuvaus) {
      throw new Error("adaptAloitusKuulutusJulkaisut: julkaisu.hankkeenKuvaus määrittelemättä");
    }

    const julkaisuJulkinen: API.AloitusKuulutusJulkaisuJulkinen = {
      __typename: "AloitusKuulutusJulkaisuJulkinen",
      kuulutusPaiva,
      siirtyySuunnitteluVaiheeseen: julkaisu.siirtyySuunnitteluVaiheeseen,
      hankkeenKuvaus: adaptLokalisoituTeksti(julkaisu.hankkeenKuvaus),
      yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
      velho: adaptVelho(velho),
      suunnitteluSopimus: adaptSuunnitteluSopimusJulkaisuJulkinen(oid, suunnitteluSopimus),
      kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
      kuulutusPDF: this.adaptJulkaisuPDFPaths(oid, julkaisu),
      tila,
      uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
    };

    if (kieli) {
      julkaisuJulkinen.kuulutusTekstit = new AloituskuulutusKutsuAdapter(
        await createAloituskuulutusKutsuAdapterProps(oid, projekti.lyhytOsoite, projekti.kayttoOikeudet, kieli, julkaisu)
      ).userInterfaceFields;
    }
    return julkaisuJulkinen;
  }

  adaptJulkaisuPDFPaths(oid: string, aloitusKuulutus: AloitusKuulutusJulkaisu): API.KuulutusPDFJulkinen | undefined {
    if (!aloitusKuulutus.aloituskuulutusPDFt) {
      return undefined;
    }

    const { SUOMI: suomiPDFS, ...muunKielisetPDFS } = aloitusKuulutus.aloituskuulutusPDFt || {};

    if (!suomiPDFS) {
      throw new Error(`adaptJulkaisuPDFPaths: aloitusKuulutusPDFS.${API.Kieli.SUOMI} määrittelemättä`);
    }

    const aloituskuulutusPath = new ProjektiPaths(oid).aloituskuulutus(aloitusKuulutus);

    const result: API.KuulutusPDFJulkinen = {
      __typename: "KuulutusPDFJulkinen",
      SUOMI: fileService.getPublicPathForProjektiFile(aloituskuulutusPath, suomiPDFS.aloituskuulutusPDFPath),
    };
    for (const k in muunKielisetPDFS) {
      const kieli = k as API.Kieli.SAAME | API.Kieli.RUOTSI;
      const pdfs = muunKielisetPDFS[kieli];
      if (pdfs) {
        result[kieli] = fileService.getPublicPathForProjektiFile(aloituskuulutusPath, pdfs.aloituskuulutusPDFPath);
      }
    }
    return result;
  }

  private static async adaptNahtavillaoloVaiheJulkaisu(
    dbProjekti: DBProjekti,
    kieli?: Kieli
  ): Promise<API.NahtavillaoloVaiheJulkaisuJulkinen | undefined> {
    const julkaisu = findPublishedKuulutusJulkaisu(dbProjekti.nahtavillaoloVaiheJulkaisut);
    if (!julkaisu) {
      return undefined;
    }
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
      uudelleenKuulutus,
    } = julkaisu;
    if (tila == KuulutusJulkaisuTila.MIGROITU) {
      return {
        __typename: "NahtavillaoloVaiheJulkaisuJulkinen",
        tila,
        velho: adaptVelho(velho),
        yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
      };
    }

    if (!aineistoNahtavilla) {
      throw new Error("adaptNahtavillaoloVaiheJulkaisu: julkaisu.aineistoNahtavilla määrittelemättä");
    }
    if (!yhteystiedot) {
      throw new Error("adaptNahtavillaoloVaiheJulkaisu: julkaisu.yhteystiedot määrittelemättä");
    }
    if (!hankkeenKuvaus) {
      throw new Error("adaptNahtavillaoloVaiheJulkaisu: julkaisu.hankkeenKuvaus määrittelemättä");
    }

    const paths = new ProjektiPaths(dbProjekti.oid).nahtavillaoloVaihe(julkaisu);
    let apiAineistoNahtavilla: API.Aineisto[] | undefined = undefined;
    if (new ProjektiAineistoManager(dbProjekti).getNahtavillaoloVaihe().isAineistoVisible(julkaisu)) {
      apiAineistoNahtavilla = adaptAineistotJulkinen(aineistoNahtavilla, paths);
    }

    const julkaisuJulkinen: API.NahtavillaoloVaiheJulkaisuJulkinen = {
      __typename: "NahtavillaoloVaiheJulkaisuJulkinen",
      hankkeenKuvaus: adaptLokalisoituTeksti(hankkeenKuvaus),
      kuulutusPaiva,
      kuulutusVaihePaattyyPaiva,
      kuulutusPDF: adaptNahtavillaoloPDFPaths(dbProjekti.oid, julkaisu),
      muistutusoikeusPaattyyPaiva,
      yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
      velho: adaptVelho(velho),
      kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
      tila,
      uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
    };
    if (apiAineistoNahtavilla) {
      julkaisuJulkinen.aineistoNahtavilla = apiAineistoNahtavilla;
    }
    if (kieli) {
      julkaisuJulkinen.kuulutusTekstit = new NahtavillaoloVaiheKutsuAdapter(
        await createNahtavillaoloVaiheKutsuAdapterProps(dbProjekti.oid, dbProjekti.lyhytOsoite, dbProjekti.kayttoOikeudet, julkaisu, kieli)
      ).userInterfaceFields;
    }
    return julkaisuJulkinen;
  }

  private static adaptVuorovaikutusKierrokset(dbProjekti: DBProjekti): API.VuorovaikutusKierrosJulkinen[] | undefined {
    const vuorovaikutukset = dbProjekti.vuorovaikutusKierrosJulkaisut;
    if (vuorovaikutukset && vuorovaikutukset.length > 0) {
      const julkaistutVuorovaikutukset: VuorovaikutusKierrosJulkaisu[] = vuorovaikutukset.filter(
        (v) => v.vuorovaikutusJulkaisuPaiva && parseDate(v.vuorovaikutusJulkaisuPaiva).isBefore(dayjs())
      );

      return julkaistutVuorovaikutukset.map((vuorovaikutus) => {
        if (!vuorovaikutus.vuorovaikutusTilaisuudet) {
          throw new Error("adaptVuorovaikutukset: vuorovaikutus.vuorovaikutusTilaisuudet määrittelmättä");
        }
        assertIsDefined(vuorovaikutus.vuorovaikutusJulkaisuPaiva);
        const julkaisuPaiva = parseDate(vuorovaikutus.vuorovaikutusJulkaisuPaiva);
        const vuorovaikutusPaths = new ProjektiPaths(dbProjekti.oid).vuorovaikutus(vuorovaikutus);
        const videotAdaptoituna: Array<API.LokalisoituLinkki> | undefined =
          (vuorovaikutus.videot?.map((video) => adaptLokalisoituLinkki(video)).filter((video) => video) as Array<API.LokalisoituLinkki>) ||
          undefined;

        const isAineistoVisible = new ProjektiAineistoManager(dbProjekti).getVuorovaikutusKierros().isAineistoVisible(vuorovaikutus);
        const vuorovaikutusJulkinen: API.VuorovaikutusKierrosJulkinen = {
          __typename: "VuorovaikutusKierrosJulkinen",
          vuorovaikutusNumero: vuorovaikutus.id,
          tila:
            dbProjekti.vuorovaikutusKierros?.tila === API.VuorovaikutusKierrosTila.MIGROITU
              ? API.VuorovaikutusKierrosTila.MIGROITU
              : API.VuorovaikutusKierrosTila.JULKINEN,
          hankkeenKuvaus: adaptLokalisoituTeksti(vuorovaikutus.hankkeenKuvaus),
          arvioSeuraavanVaiheenAlkamisesta: adaptLokalisoituTeksti(vuorovaikutus.arvioSeuraavanVaiheenAlkamisesta),
          suunnittelunEteneminenJaKesto: adaptLokalisoituTeksti(vuorovaikutus.suunnittelunEteneminenJaKesto),
          vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudet(vuorovaikutus.vuorovaikutusTilaisuudet),
          vuorovaikutusJulkaisuPaiva: vuorovaikutus.vuorovaikutusJulkaisuPaiva,
          kysymyksetJaPalautteetViimeistaan: vuorovaikutus.kysymyksetJaPalautteetViimeistaan,
          videot: videotAdaptoituna,
          suunnittelumateriaali: adaptLokalisoituLinkki(vuorovaikutus.suunnittelumateriaali),
          esittelyaineistot: isAineistoVisible
            ? adaptAineistotJulkinen(vuorovaikutus.esittelyaineistot, vuorovaikutusPaths.aineisto, julkaisuPaiva)
            : undefined,
          suunnitelmaluonnokset: isAineistoVisible
            ? adaptAineistotJulkinen(vuorovaikutus.suunnitelmaluonnokset, vuorovaikutusPaths.aineisto, julkaisuPaiva)
            : undefined,
          yhteystiedot: adaptYhteystiedotByAddingTypename(vuorovaikutus.yhteystiedot) as API.Yhteystieto[],
          vuorovaikutusPDFt: adaptVuorovaikutusPDFPaths(dbProjekti.oid, vuorovaikutus),
        };
        return vuorovaikutusJulkinen;
      });
    } else if (dbProjekti.vuorovaikutusKierros?.tila === API.VuorovaikutusKierrosTila.MIGROITU) {
      return [
        {
          __typename: "VuorovaikutusKierrosJulkinen",
          vuorovaikutusNumero: 0,
          tila: API.VuorovaikutusKierrosTila.MIGROITU,
          yhteystiedot: [],
        },
      ];
    }
    return vuorovaikutukset as undefined;
  }

  private static adaptHyvaksymisPaatosVaihe(
    dbProjekti: DBProjekti,
    paatosVaiheJulkaisut: HyvaksymisPaatosVaiheJulkaisu[] | undefined | null,
    hyvaksymispaatos: Hyvaksymispaatos | undefined | null,
    getPathCallback: (julkaisu: HyvaksymisPaatosVaiheJulkaisu) => PathTuple,
    paatosVaiheAineisto: HyvaksymisPaatosVaiheAineisto,
    kieli?: Kieli
  ): API.HyvaksymisPaatosVaiheJulkaisuJulkinen | undefined {
    const julkaisu = findPublishedKuulutusJulkaisu(paatosVaiheJulkaisut);
    if (!julkaisu) {
      return undefined;
    }
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
      uudelleenKuulutus,
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
    const paths = getPathCallback(julkaisu);

    let apiHyvaksymisPaatosAineisto: API.Aineisto[] | undefined = undefined;
    let apiAineistoNahtavilla: API.Aineisto[] | undefined = undefined;
    if (paatosVaiheAineisto.isAineistoVisible(julkaisu)) {
      apiHyvaksymisPaatosAineisto = adaptAineistotJulkinen(hyvaksymisPaatos, paths);
      apiAineistoNahtavilla = adaptAineistotJulkinen(aineistoNahtavilla, paths);
    }

    const julkaisuJulkinen: API.HyvaksymisPaatosVaiheJulkaisuJulkinen = {
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
      uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
      kuulutusPDF: adaptHyvaksymispaatosPDFPaths(dbProjekti.oid, julkaisu),
    };

    if (kieli) {
      julkaisuJulkinen.kuulutusTekstit = new HyvaksymisPaatosVaiheKutsuAdapter(
        createHyvaksymisPaatosVaiheKutsuAdapterProps(
          dbProjekti.oid,
          dbProjekti.lyhytOsoite,
          dbProjekti.kayttoOikeudet,
          kieli,
          julkaisu,
          dbProjekti.kasittelynTila
        )
      ).userInterfaceFields;
    }
    return julkaisuJulkinen;
  }
}

function isUnsetOrInPast(julkaisuPaiva?: dayjs.Dayjs) {
  return !julkaisuPaiva || julkaisuPaiva.isBefore(dayjs());
}

export function adaptUudelleenKuulutus(uudelleenKuulutus: UudelleenKuulutus | null | undefined): API.UudelleenKuulutus | null | undefined {
  if (!uudelleenKuulutus) {
    return uudelleenKuulutus;
  }
  return {
    __typename: "UudelleenKuulutus",
    tila: uudelleenKuulutus.tila,
    alkuperainenHyvaksymisPaiva: uudelleenKuulutus.alkuperainenHyvaksymisPaiva,
    selosteKuulutukselle: adaptPakotettuLokalisoituTeksti(uudelleenKuulutus?.selosteKuulutukselle),
    selosteLahetekirjeeseen: null,
  };
}

/**
 *
 * @param aineistot
 * @param paths
 * @param julkaisuPaiva Jos ei asetettu, aineistolla ei ole ajastettua julkaisua, joten se on aina julkista
 */
function adaptAineistotJulkinen(
  aineistot: Aineisto[] | null | undefined,
  paths: PathTuple,
  julkaisuPaiva?: Dayjs
): API.Aineisto[] | undefined {
  if (isUnsetOrInPast(julkaisuPaiva) && aineistot && aineistot.length > 0) {
    return aineistot
      .filter((aineisto) => aineisto.tila == API.AineistoTila.VALMIS && aineisto.tiedosto)
      .map((aineisto) => {
        if (!aineisto.tiedosto) {
          throw new Error("adaptAineistotJulkinen: aineisto.tiedosto määrittelemättä");
        }
        const { nimi, dokumenttiOid, jarjestys, kategoriaId, tuotu } = aineisto;
        const tiedosto = fileService.getPublicPathForProjektiFile(paths, aineisto.tiedosto);
        return {
          __typename: "Aineisto",
          dokumenttiOid,
          tiedosto,
          nimi,
          jarjestys,
          kategoriaId,
          tuotu,
        };
      });
  }
  return undefined;
}

function adaptVuorovaikutusTilaisuudet(
  vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuusJulkaisu>
): API.VuorovaikutusTilaisuusJulkinen[] {
  const vuorovaikutusTilaisuudetCopy = cloneDeep(vuorovaikutusTilaisuudet);
  return vuorovaikutusTilaisuudetCopy.map((vuorovaikutusTilaisuus) => {
    const yhteystiedot: Yhteystieto[] | undefined = vuorovaikutusTilaisuus.yhteystiedot;
    const nimi: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.nimi;
    const Saapumisohjeet: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.Saapumisohjeet;
    const osoite: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.osoite;
    const paikka: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.paikka;
    const postitoimipaikka: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.postitoimipaikka;
    const { tyyppi, paivamaara, alkamisAika, paattymisAika, peruttu } = vuorovaikutusTilaisuus;
    const tilaisuus: API.VuorovaikutusTilaisuusJulkinen = {
      tyyppi,
      paivamaara,
      alkamisAika,
      paattymisAika,
      peruttu,
      __typename: "VuorovaikutusTilaisuusJulkinen",
    };
    if (tilaisuus.tyyppi === API.VuorovaikutusTilaisuusTyyppi.SOITTOAIKA) {
      tilaisuus.yhteystiedot = adaptYhteystiedotByAddingTypename(yhteystiedot);
    }
    if (tilaisuus.tyyppi === API.VuorovaikutusTilaisuusTyyppi.VERKOSSA) {
      tilaisuus.kaytettavaPalvelu = vuorovaikutusTilaisuus.kaytettavaPalvelu;
      if (isVerkkotilaisuusLinkkiVisible(vuorovaikutusTilaisuus)) {
        tilaisuus.linkki = vuorovaikutusTilaisuus.linkki;
      }
    }
    if (nimi) {
      tilaisuus.nimi = adaptLokalisoituTeksti(nimi);
    }
    if (Saapumisohjeet) {
      tilaisuus.Saapumisohjeet = adaptLokalisoituTeksti(Saapumisohjeet);
    }
    if (osoite) {
      tilaisuus.osoite = adaptLokalisoituTeksti(osoite);
    }
    if (paikka) {
      tilaisuus.paikka = adaptLokalisoituTeksti(paikka);
    }
    if (postitoimipaikka) {
      tilaisuus.postitoimipaikka = adaptLokalisoituTeksti(postitoimipaikka);
    }
    if (vuorovaikutusTilaisuus.postinumero) {
      tilaisuus.postinumero = vuorovaikutusTilaisuus.postinumero;
    }
    return tilaisuus;
  });
}

function adaptVuorovaikutusPDFPaths(oid: string, vuorovaikutus: VuorovaikutusKierrosJulkaisu): API.VuorovaikutusPDFt | undefined {
  const vuorovaikutuspdfs = vuorovaikutus.vuorovaikutusPDFt;
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
        kutsuPDFPath: fileService.getPublicPathForProjektiFile(new ProjektiPaths(oid).vuorovaikutus(vuorovaikutus), pdfs.kutsuPDFPath),
      };
    }
  }
  return { __typename: "VuorovaikutusPDFt", [API.Kieli.SUOMI]: result[API.Kieli.SUOMI] as API.VuorovaikutusPDF, ...result };
}

function adaptHyvaksymispaatosPDFPaths(oid: string, hyvaksymispaatos: HyvaksymisPaatosVaiheJulkaisu): API.KuulutusPDFJulkinen | undefined {
  if (!hyvaksymispaatos.hyvaksymisPaatosVaihePDFt) {
    return undefined;
  }
  const { SUOMI: suomiPDFs, ...hyvaksymispdfs } = hyvaksymispaatos.hyvaksymisPaatosVaihePDFt || {};

  if (!suomiPDFs) {
    throw new Error(`adaptHyvaksymispaatosPDFPaths: hyvaksymispaatos.${API.Kieli.SUOMI} määrittelemättä`);
  }

  const result: API.KuulutusPDFJulkinen = {
    __typename: "KuulutusPDFJulkinen",
    SUOMI: fileService.getPublicPathForProjektiFile(
      new ProjektiPaths(oid).hyvaksymisPaatosVaihe(hyvaksymispaatos),
      suomiPDFs.hyvaksymisKuulutusPDFPath
    ),
  };

  for (const k in hyvaksymispdfs) {
    const kieli = k as API.Kieli.RUOTSI | API.Kieli.SAAME;
    const pdfs = hyvaksymispdfs[kieli];
    if (pdfs) {
      result[kieli] = fileService.getPublicPathForProjektiFile(
        new ProjektiPaths(oid).hyvaksymisPaatosVaihe(hyvaksymispaatos),
        pdfs.hyvaksymisKuulutusPDFPath
      );
    }
  }
  return result;
}

function adaptNahtavillaoloPDFPaths(oid: string, nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu): API.KuulutusPDFJulkinen | undefined {
  if (!nahtavillaoloVaihe.nahtavillaoloPDFt) {
    return undefined;
  }
  const { SUOMI: suomiPDFs, ...hyvaksymispdfs } = nahtavillaoloVaihe.nahtavillaoloPDFt || {};

  if (!suomiPDFs) {
    throw new Error(`adaptNahtavillaoloPDFPaths: nahtavillaoloVaihe.${API.Kieli.SUOMI} määrittelemättä`);
  }

  const result: API.KuulutusPDFJulkinen = {
    __typename: "KuulutusPDFJulkinen",
    SUOMI: fileService.getPublicPathForProjektiFile(
      new ProjektiPaths(oid).nahtavillaoloVaihe(nahtavillaoloVaihe),
      suomiPDFs.nahtavillaoloPDFPath
    ),
  };

  for (const k in hyvaksymispdfs) {
    const kieli = k as API.Kieli.RUOTSI | API.Kieli.SAAME;
    const pdfs = hyvaksymispdfs[kieli];
    if (pdfs) {
      result[kieli] = fileService.getPublicPathForProjektiFile(
        new ProjektiPaths(oid).nahtavillaoloVaihe(nahtavillaoloVaihe),
        pdfs.nahtavillaoloPDFPath
      );
    }
  }
  return result;
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
        elyOrganisaatio: kayttoOikeus.elyOrganisaatio,
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
  // Variable "a" is projektipaallikko and b is not thus "a" is put before "b"
  if (a.projektiPaallikko && !b.projektiPaallikko) {
    return -1;
  }
  // "b" is projektipaallikko and "a" is not thus "b" is put before "a"
  if (!a.projektiPaallikko && b.projektiPaallikko) {
    return 1;
  }
  // "a" and "b" are equal
  return 0;
};

export const projektiAdapterJulkinen = new ProjektiAdapterJulkinen();
