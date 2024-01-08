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
import * as API from "hassu-common/graphql/apiModel";
import { KuulutusJulkaisuTila, ProjektiJulkinen, Status } from "hassu-common/graphql/apiModel";
import pickBy from "lodash/pickBy";
import dayjs, { Dayjs } from "dayjs";
import { fileService } from "../../files/fileService";
import { nyt, parseDate } from "../../util/dateUtil";
import { PathTuple, ProjektiPaths } from "../../files/ProjektiPath";
import {
  adaptKielitiedotByAddingTypename,
  adaptLokalisoidutLinkit,
  adaptLokalisoituLinkki,
  adaptLokalisoituTeksti,
  adaptMandatoryYhteystiedotByAddingTypename,
  adaptYhteystiedotByAddingTypename,
  findPublishedKuulutusJulkaisu,
  adaptProjektiHenkilo,
} from "./common";
import { findUserByKayttajatunnus } from "../projektiUtil";
import { applyProjektiJulkinenStatus } from "../status/projektiJulkinenStatusHandler";
import {
  adaptLogotJulkinen,
  adaptLokalisoituTeksti as adaptPakotettuLokalisoituTeksti,
  adaptSuunnitteluSopimusJulkaisuJulkinen,
  adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisuJulkinen,
  adaptVuorovaikutusSaamePDFt,
} from "./adaptToAPI";
import cloneDeep from "lodash/cloneDeep";
import { kuntametadata } from "hassu-common/kuntametadata";
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
import { KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import { adaptKuulutusSaamePDFt } from "./adaptToAPI/adaptCommonToAPI";
import {
  collectJulkinenVuorovaikutusSorted,
  collectVuorovaikutusKierrosJulkinen,
  ProjektiVuorovaikutuksilla,
} from "../../util/vuorovaikutus";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";
import {
  HyvaksymisPaatosVaiheScheduleManager,
  isVerkkotilaisuusLinkkiVisible,
  ProjektiScheduleManager,
} from "../../sqsEvents/projektiScheduleManager";
import { PaatosTyyppi } from "hassu-common/hyvaksymisPaatosUtil";
import { jaotteleVuorovaikutusAineistot } from "hassu-common/vuorovaikutusAineistoKategoria";
import { getLinkkiAsianhallintaan } from "../../asianhallinta/getLinkkiAsianhallintaan";
import { isProjektiAsianhallintaIntegrationEnabled } from "../../util/isProjektiAsianhallintaIntegrationEnabled";

export function getPaatosTyyppi(asiakirjaTyyppi: API.AsiakirjaTyyppi) {
  if (
    asiakirjaTyyppi === API.AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA ||
    asiakirjaTyyppi === API.AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE ||
    asiakirjaTyyppi === API.AsiakirjaTyyppi.JATKOPAATOSKUULUTUS ||
    asiakirjaTyyppi === API.AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA_MAAKUNTALIITOILLE
  ) {
    return PaatosTyyppi.JATKOPAATOS1;
  } else if (
    asiakirjaTyyppi === API.AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2 ||
    asiakirjaTyyppi === API.AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE ||
    asiakirjaTyyppi === API.AsiakirjaTyyppi.JATKOPAATOSKUULUTUS2 ||
    asiakirjaTyyppi === API.AsiakirjaTyyppi.ILMOITUS_JATKOPAATOSKUULUTUKSESTA2_MAAKUNTALIITOILLE
  ) {
    return PaatosTyyppi.JATKOPAATOS2;
  } else {
    return PaatosTyyppi.HYVAKSYMISPAATOS;
  }
}

class ProjektiAdapterJulkinen {
  public async adaptProjekti(
    dbProjekti: DBProjekti,
    kieli: KaannettavaKieli | undefined = undefined,
    returnUndefinedForNonPublic: boolean = true
  ): Promise<ProjektiJulkinen | undefined> {
    if (!dbProjekti.velho) {
      throw new Error("adaptProjekti: dbProjekti.velho määrittelemättä");
    }
    const aloitusKuulutusJulkaisu = await this.adaptAloitusKuulutusJulkaisu(dbProjekti, dbProjekti.aloitusKuulutusJulkaisut, kieli);
    if (!aloitusKuulutusJulkaisu) {
      return {
        __typename: "ProjektiJulkinen",
        oid: dbProjekti.oid,
        velho: { __typename: "VelhoJulkinen" },
        status: Status.EI_JULKAISTU,
      };
    }

    const projektiHenkilot: API.ProjektiKayttajaJulkinen[] = adaptProjektiHenkilot(
      dbProjekti.kayttoOikeudet,
      dbProjekti.suunnitteluSopimus?.yhteysHenkilo
    );

    const vuorovaikutukset = ProjektiAdapterJulkinen.adaptVuorovaikutusKierrokset(dbProjekti);
    const nahtavillaoloVaihe = await ProjektiAdapterJulkinen.adaptNahtavillaoloVaiheJulkaisu(dbProjekti, kieli);
    const suunnitteluSopimus = adaptRootSuunnitteluSopimusJulkaisu(dbProjekti);
    const euRahoitusLogot = adaptLogotJulkinen(dbProjekti.oid, dbProjekti.euRahoitusLogot);
    const projektiScheduleManager = new ProjektiScheduleManager(dbProjekti);
    const hyvaksymisPaatosVaihe = await ProjektiAdapterJulkinen.adaptHyvaksymisPaatosVaihe(
      dbProjekti,
      dbProjekti.hyvaksymisPaatosVaiheJulkaisut,
      dbProjekti.kasittelynTila?.hyvaksymispaatos,
      (julkaisu) => new ProjektiPaths(dbProjekti.oid).hyvaksymisPaatosVaihe(julkaisu),
      projektiScheduleManager.getHyvaksymisPaatosVaihe(),
      PaatosTyyppi.HYVAKSYMISPAATOS,
      kieli
    );
    const jatkoPaatos1Vaihe = await ProjektiAdapterJulkinen.adaptHyvaksymisPaatosVaihe(
      dbProjekti,
      dbProjekti.jatkoPaatos1VaiheJulkaisut,
      dbProjekti.kasittelynTila?.ensimmainenJatkopaatos,
      (julkaisu) => new ProjektiPaths(dbProjekti.oid).jatkoPaatos1Vaihe(julkaisu),
      projektiScheduleManager.getJatkoPaatos1Vaihe(),
      PaatosTyyppi.JATKOPAATOS1,
      kieli
    );
    const jatkoPaatos2Vaihe = await ProjektiAdapterJulkinen.adaptHyvaksymisPaatosVaihe(
      dbProjekti,
      dbProjekti.jatkoPaatos2VaiheJulkaisut,
      dbProjekti.kasittelynTila?.toinenJatkopaatos,
      (julkaisu) => new ProjektiPaths(dbProjekti.oid).jatkoPaatos2Vaihe(julkaisu),
      projektiScheduleManager.getJatkoPaatos2Vaihe(),
      PaatosTyyppi.JATKOPAATOS2,
      kieli
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
      vuorovaikutukset,
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
    if (projektiJulkinen.status && this.isStatusPublic(projektiJulkinen.status)) {
      return projektiJulkinen;
    } else if (projektiJulkinen.status === Status.EI_JULKAISTU) {
      return {
        __typename: "ProjektiJulkinen",
        oid: dbProjekti.oid,
        velho: { __typename: "VelhoJulkinen" },
        status: projektiJulkinen.status,
      };
    }

    return returnUndefinedForNonPublic ? undefined : projekti;
  }

  private isStatusPublic(status: Status) {
    const notPublicStatuses = [Status.EI_JULKAISTU, Status.EPAAKTIIVINEN_1, Status.EPAAKTIIVINEN_2, Status.EPAAKTIIVINEN_3];
    return !notPublicStatuses.includes(status);
  }

  async adaptAloitusKuulutusJulkaisu(
    projekti: DBProjekti,
    aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null,
    kieli?: KaannettavaKieli
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

    const aloituskuulutusPath = new ProjektiPaths(oid).aloituskuulutus(julkaisu);

    const julkaisuJulkinen: API.AloitusKuulutusJulkaisuJulkinen = {
      __typename: "AloitusKuulutusJulkaisuJulkinen",
      kuulutusPaiva,
      siirtyySuunnitteluVaiheeseen: julkaisu.siirtyySuunnitteluVaiheeseen,
      hankkeenKuvaus: adaptLokalisoituTeksti(julkaisu.hankkeenKuvaus),
      yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
      velho: adaptVelho(velho),
      suunnitteluSopimus: adaptSuunnitteluSopimusJulkaisuJulkinen(oid, suunnitteluSopimus),
      kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
      kuulutusPDF: this.adaptAloituskuulutusJulkaisuPDFPaths(aloituskuulutusPath, julkaisu),
      aloituskuulutusSaamePDFt: adaptKuulutusSaamePDFt(aloituskuulutusPath, julkaisu.aloituskuulutusSaamePDFt, true),
      tila,
      uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
    };

    if (kieli) {
      julkaisuJulkinen.kuulutusTekstit = new AloituskuulutusKutsuAdapter(
        await createAloituskuulutusKutsuAdapterProps(
          oid,
          projekti.lyhytOsoite,
          projekti.kayttoOikeudet,
          kieli,
          await isProjektiAsianhallintaIntegrationEnabled(projekti),
          await getLinkkiAsianhallintaan(projekti),
          julkaisu,
          undefined,
          projekti.vahainenMenettely
        )
      ).userInterfaceFields;
    }
    return julkaisuJulkinen;
  }

  adaptAloituskuulutusJulkaisuPDFPaths(
    aloituskuulutusPath: PathTuple,
    aloitusKuulutus: AloitusKuulutusJulkaisu
  ): API.KuulutusPDFJulkinen | undefined {
    if (!aloitusKuulutus.aloituskuulutusPDFt) {
      return undefined;
    }

    const { SUOMI: suomiPDFS, ...muunKielisetPDFS } = aloitusKuulutus.aloituskuulutusPDFt || {};

    if (!suomiPDFS) {
      throw new Error(`adaptJulkaisuPDFPaths: aloitusKuulutusPDFS.${API.Kieli.SUOMI} määrittelemättä`);
    }

    const result: API.KuulutusPDFJulkinen = {
      __typename: "KuulutusPDFJulkinen",
      SUOMI: fileService.getPublicPathForProjektiFile(aloituskuulutusPath, suomiPDFS.aloituskuulutusPDFPath),
    };
    for (const k in muunKielisetPDFS) {
      const kieli = k as API.Kieli.RUOTSI;
      const pdfs = muunKielisetPDFS[kieli];
      if (pdfs) {
        result[kieli] = fileService.getPublicPathForProjektiFile(aloituskuulutusPath, pdfs.aloituskuulutusPDFPath);
      }
    }
    return result;
  }

  private static async adaptNahtavillaoloVaiheJulkaisu(
    dbProjekti: DBProjekti,
    kieli?: KaannettavaKieli
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
      nahtavillaoloSaamePDFt,
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
    if (new ProjektiScheduleManager(dbProjekti).getNahtavillaoloVaihe().isAineistoVisible(julkaisu)) {
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
      const velho = dbProjekti.velho;
      assertIsDefined(velho, "Projektilta puuttuu velho-tieto!");
      julkaisuJulkinen.kuulutusTekstit = new NahtavillaoloVaiheKutsuAdapter(
        await createNahtavillaoloVaiheKutsuAdapterProps(
          dbProjekti,
          julkaisu,
          kieli,
          await isProjektiAsianhallintaIntegrationEnabled(dbProjekti),
          await getLinkkiAsianhallintaan(dbProjekti)
        )
      ).userInterfaceFields;
    }
    if (nahtavillaoloSaamePDFt) {
      julkaisuJulkinen.nahtavillaoloSaamePDFt = adaptKuulutusSaamePDFt(paths, julkaisu.nahtavillaoloSaamePDFt, true);
    }
    return julkaisuJulkinen;
  }

  private static adaptVuorovaikutusKierrokset(dbProjekti: DBProjekti): API.VuorovaikutusJulkinen | undefined {
    const vuorovaikutukset = dbProjekti.vuorovaikutusKierrosJulkaisut;
    if (vuorovaikutukset && vuorovaikutukset.length > 0) {
      const julkaistutVuorovaikutukset: VuorovaikutusKierrosJulkaisu[] =
        collectVuorovaikutusKierrosJulkinen<VuorovaikutusKierrosJulkaisu>(vuorovaikutukset);
      if (!julkaistutVuorovaikutukset.length) return undefined;
      const julkaistutTilaisuudet: VuorovaikutusTilaisuusJulkaisu[] = collectJulkinenVuorovaikutusSorted(
        dbProjekti as ProjektiVuorovaikutuksilla
      );
      const viimeisinVuorovaikutusKierros: VuorovaikutusKierrosJulkaisu = julkaistutVuorovaikutukset[julkaistutVuorovaikutukset.length - 1];

      assertIsDefined(viimeisinVuorovaikutusKierros.vuorovaikutusJulkaisuPaiva);
      const julkaisuPaiva = parseDate(viimeisinVuorovaikutusKierros.vuorovaikutusJulkaisuPaiva);
      const vuorovaikutusPaths = new ProjektiPaths(dbProjekti.oid).vuorovaikutus(viimeisinVuorovaikutusKierros);
      const videotAdaptoituna: Array<API.LokalisoituLinkki> | undefined =
        (viimeisinVuorovaikutusKierros.videot
          ?.map((video) => adaptLokalisoituLinkki(video))
          .filter((video) => video) as Array<API.LokalisoituLinkki>) || undefined;

      const isAineistoVisible = new ProjektiScheduleManager(dbProjekti)
        .getVuorovaikutusKierros()
        .isAineistoVisible(viimeisinVuorovaikutusKierros);

      const { esittelyaineistot, suunnitelmaluonnokset } = jaotteleVuorovaikutusAineistot(viimeisinVuorovaikutusKierros.aineistot) ?? {};

      const vuorovaikutusJulkinen: API.VuorovaikutusJulkinen = {
        __typename: "VuorovaikutusJulkinen",
        vuorovaikutusNumero: viimeisinVuorovaikutusKierros.id,
        tila:
          dbProjekti.vuorovaikutusKierros?.tila === API.VuorovaikutusKierrosTila.MIGROITU
            ? API.VuorovaikutusKierrosTila.MIGROITU
            : API.VuorovaikutusKierrosTila.JULKINEN,
        hankkeenKuvaus: adaptLokalisoituTeksti(viimeisinVuorovaikutusKierros.hankkeenKuvaus),
        arvioSeuraavanVaiheenAlkamisesta: adaptLokalisoituTeksti(viimeisinVuorovaikutusKierros.arvioSeuraavanVaiheenAlkamisesta),
        suunnittelunEteneminenJaKesto: adaptLokalisoituTeksti(viimeisinVuorovaikutusKierros.suunnittelunEteneminenJaKesto),
        vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudet(julkaistutTilaisuudet),
        vuorovaikutusJulkaisuPaiva: viimeisinVuorovaikutusKierros.vuorovaikutusJulkaisuPaiva,
        kysymyksetJaPalautteetViimeistaan: viimeisinVuorovaikutusKierros.kysymyksetJaPalautteetViimeistaan,
        videot: videotAdaptoituna,
        suunnittelumateriaali: adaptLokalisoidutLinkit(viimeisinVuorovaikutusKierros.suunnittelumateriaali),
        esittelyaineistot: isAineistoVisible
          ? adaptAineistotJulkinen(esittelyaineistot, vuorovaikutusPaths.aineisto, julkaisuPaiva)
          : undefined,
        suunnitelmaluonnokset: isAineistoVisible
          ? adaptAineistotJulkinen(suunnitelmaluonnokset, vuorovaikutusPaths.aineisto, julkaisuPaiva)
          : undefined,
        yhteystiedot: adaptYhteystiedotByAddingTypename(viimeisinVuorovaikutusKierros.yhteystiedot) as API.Yhteystieto[],
        vuorovaikutusPDFt: adaptVuorovaikutusPDFPaths(vuorovaikutusPaths, viimeisinVuorovaikutusKierros),
        vuorovaikutusSaamePDFt: adaptVuorovaikutusSaamePDFt(vuorovaikutusPaths, viimeisinVuorovaikutusKierros.vuorovaikutusSaamePDFt, true),
      };
      return vuorovaikutusJulkinen;
    } else if (dbProjekti.vuorovaikutusKierros?.tila === API.VuorovaikutusKierrosTila.MIGROITU) {
      return {
        __typename: "VuorovaikutusJulkinen",
        vuorovaikutusNumero: 1,
        tila: API.VuorovaikutusKierrosTila.MIGROITU,
        yhteystiedot: [],
      };
    }
    return undefined;
  }

  private static async adaptHyvaksymisPaatosVaihe(
    dbProjekti: DBProjekti,
    paatosVaiheJulkaisut: HyvaksymisPaatosVaiheJulkaisu[] | undefined | null,
    hyvaksymispaatos: Hyvaksymispaatos | undefined | null,
    getPathCallback: (julkaisu: HyvaksymisPaatosVaiheJulkaisu) => PathTuple,
    paatosVaiheAineisto: HyvaksymisPaatosVaiheScheduleManager,
    paatosTyyppi: PaatosTyyppi,
    kieli?: KaannettavaKieli
  ): Promise<API.HyvaksymisPaatosVaiheJulkaisuJulkinen | undefined> {
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
      return {
        __typename: "HyvaksymisPaatosVaiheJulkaisuJulkinen",
        tila,
        yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
        velho: adaptVelho(velho),
      };
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
      yhteystiedot: adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot),
      velho: adaptVelho(velho),
      kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
      hallintoOikeus,
      tila,
      uudelleenKuulutus: adaptUudelleenKuulutus(uudelleenKuulutus),
      kuulutusPDF: adaptHyvaksymispaatosPDFPaths(paths, julkaisu),
      hyvaksymisPaatosVaiheSaamePDFt: adaptKuulutusSaamePDFt(paths, julkaisu.hyvaksymisPaatosVaiheSaamePDFt, true),
    };

    if (kieli) {
      julkaisuJulkinen.kuulutusTekstit = new HyvaksymisPaatosVaiheKutsuAdapter(
        createHyvaksymisPaatosVaiheKutsuAdapterProps(
          dbProjekti,
          kieli,
          julkaisu,
          paatosTyyppi,
          await isProjektiAsianhallintaIntegrationEnabled(dbProjekti),
          await getLinkkiAsianhallintaan(dbProjekti)
        )
      ).userInterfaceFields;
    }
    return julkaisuJulkinen;
  }
}

function isUnsetOrInPast(julkaisuPaiva?: dayjs.Dayjs) {
  return !julkaisuPaiva || julkaisuPaiva.isBefore(nyt());
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
      .sort(jarjestaTiedostot)
      .map((aineisto) => {
        if (!aineisto.tiedosto) {
          throw new Error("adaptAineistotJulkinen: aineisto.tiedosto määrittelemättä");
        }
        const { nimi, dokumenttiOid, jarjestys, kategoriaId, tuotu, uuid } = aineisto;
        let tiedosto = fileService.getPublicPathForProjektiFile(paths, aineisto.tiedosto);
        // Enkoodaa tiedoston polku jos se ei ole jo enkoodattu
        const parts = tiedosto.split("/");
        const fileNamePart = parts[parts.length - 1];
        if (decodeURIComponent(fileNamePart) == fileNamePart) {
          parts[parts.length - 1] = encodeURIComponent(fileNamePart);
          tiedosto = parts.join("/");
        }

        return {
          __typename: "Aineisto",
          dokumenttiOid,
          tiedosto,
          nimi,
          jarjestys,
          kategoriaId,
          tuotu,
          uuid,
          tila: API.AineistoTila.VALMIS,
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
    const lisatiedot: LocalizedMap<string> | undefined = vuorovaikutusTilaisuus.lisatiedot;
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
      assertIsDefined(yhteystiedot);
      tilaisuus.yhteystiedot = adaptMandatoryYhteystiedotByAddingTypename(yhteystiedot);
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
    if (lisatiedot) {
      tilaisuus.lisatiedot = adaptLokalisoituTeksti(lisatiedot);
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

function adaptVuorovaikutusPDFPaths(
  vuorovaikutusPaths: PathTuple,
  vuorovaikutus: VuorovaikutusKierrosJulkaisu
): API.VuorovaikutusPDFt | undefined {
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
      result[kieli as KaannettavaKieli] = {
        __typename: "VuorovaikutusPDF",
        kutsuPDFPath: fileService.getPublicPathForProjektiFile(vuorovaikutusPaths, pdfs.kutsuPDFPath),
      };
    }
  }
  return { __typename: "VuorovaikutusPDFt", [API.Kieli.SUOMI]: result[API.Kieli.SUOMI] as API.VuorovaikutusPDF, ...result };
}

function adaptHyvaksymispaatosPDFPaths(
  projektiPath: PathTuple,
  hyvaksymispaatos: HyvaksymisPaatosVaiheJulkaisu
): API.KuulutusPDFJulkinen | undefined {
  if (!hyvaksymispaatos.hyvaksymisPaatosVaihePDFt) {
    return undefined;
  }
  const { SUOMI: suomiPDFs, ...hyvaksymispdfs } = hyvaksymispaatos.hyvaksymisPaatosVaihePDFt || {};

  if (!suomiPDFs) {
    throw new Error(`adaptHyvaksymispaatosPDFPaths: hyvaksymispaatos.${API.Kieli.SUOMI} määrittelemättä`);
  }

  const result: API.KuulutusPDFJulkinen = {
    __typename: "KuulutusPDFJulkinen",
    SUOMI: fileService.getPublicPathForProjektiFile(projektiPath, suomiPDFs.hyvaksymisKuulutusPDFPath),
  };

  for (const k in hyvaksymispdfs) {
    const kieli = k as API.Kieli.RUOTSI;
    const pdfs = hyvaksymispdfs[kieli];
    if (pdfs) {
      result[kieli] = fileService.getPublicPathForProjektiFile(projektiPath, pdfs.hyvaksymisKuulutusPDFPath);
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
    const kieli = k as API.Kieli.RUOTSI;
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
    linkki,
    geoJSON,
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
    linkki,
    geoJSON,
  };
}

function adaptProjektiHenkilot(
  kayttoOikeudet: DBVaylaUser[],
  suunnitteluSopimuksenKayttajaTunnus: string | undefined
): API.ProjektiKayttajaJulkinen[] {
  return kayttoOikeudet
    ?.filter((kayttoOikeus) => kayttoOikeus.tyyppi === API.KayttajaTyyppi.PROJEKTIPAALLIKKO || !!kayttoOikeus.yleinenYhteystieto)
    ?.filter((kayttoOikeus) => kayttoOikeus.kayttajatunnus !== suunnitteluSopimuksenKayttajaTunnus)
    ?.map((kayttoOikeus) => adaptProjektiHenkilo(kayttoOikeus))
    ?.sort(sortByProjektiPaallikko);
}

function adaptRootSuunnitteluSopimusJulkaisu(dbProjekti: DBProjekti) {
  const yhteysHenkilo = findUserByKayttajatunnus(dbProjekti.kayttoOikeudet, dbProjekti.suunnitteluSopimus?.yhteysHenkilo);
  return adaptSuunnitteluSopimusToSuunnitteluSopimusJulkaisuJulkinen(dbProjekti.oid, dbProjekti.suunnitteluSopimus, yhteysHenkilo);
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
