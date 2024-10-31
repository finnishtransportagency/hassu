import { DBProjekti } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { KayttoOikeudetManager } from "../kayttoOikeudetManager";
import { personSearch } from "../../personSearch/personSearchClient";
import pickBy from "lodash/pickBy";
import { lisaAineistoService } from "../../tiedostot/lisaAineistoService";
import {
  adaptAloitusKuulutusToAPI,
  adaptAloitusKuulutusJulkaisuToAPI,
  adaptHyvaksymisPaatosVaiheToAPI,
  adaptHyvaksymisPaatosVaiheJulkaisuToAPI,
  adaptKasittelynTilaToAPI,
  adaptKielitiedotByAddingTypename,
  adaptLausuntoPyynnonTaydennyksetToAPI,
  adaptLausuntoPyynnotToAPI,
  adaptLogotToAPI,
  adaptNahtavillaoloVaiheToAPI,
  adaptNahtavillaoloVaiheJulkaisuToAPI,
  adaptSuunnitteluSopimusToAPI,
  adaptVelhoToAPI,
  adaptVuorovaikutusKierrosToAPI,
  adaptVuorovaikutusKierrosJulkaisutToAPI,
  adaptHyvaksymisEsitysToAPI,
  adaptDBVaylaUsertoAPIProjektiKayttaja,
} from "./adaptToAPI";
import {
  adaptAloitusKuulutusToSave,
  adaptHyvaksymisPaatosVaiheToSave,
  adaptLogoFilesToSave,
  adaptNahtavillaoloVaiheToSave,
  adaptSuunnitteluSopimusToSave,
  adaptVuorovaikutusKierrosToSave,
} from "./adaptToDB";
import { projektiAdapterJulkinen } from "./projektiAdapterJulkinen";
import { adaptKasittelynTilaToSave } from "./adaptToDB/adaptKasittelynTilaToSave";
import { ProjektiAdaptationResult } from "./projektiAdaptationResult";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { preventArrayMergingCustomizer } from "../../util/preventArrayMergingCustomizer";
import { haeAktiivisenVaiheenAsianhallinnanTila } from "./haeAktiivisenVaiheenAsianhallinnanTila";
import { adaptAsianhallinta } from "./adaptAsianhallinta";
import { adaptLausuntoPyynnonTaydennyksetToSave, adaptLausuntoPyynnotToSave } from "./adaptToDB/adaptLausuntoPyynnotToSave";
import { getLinkkiAsianhallintaan } from "../../asianhallinta/getLinkkiAsianhallintaan";
import GetProjektiStatus from "../status/getProjektiStatus";
import { isStatusGreaterOrEqualTo } from "hassu-common/statusOrder";
import { adaptEnnakkoNeuvotteluJulkaisuToAPI, adaptEnnakkoNeuvotteluToAPI } from "../../ennakkoneuvottelu/mapper";

export class ProjektiAdapter {
  public async adaptProjekti(
    dbProjekti: DBProjekti,
    virhetiedot?: API.ProjektiVirhe,
    checkAsianhallintaState = true
  ): Promise<API.Projekti> {
    const {
      kayttoOikeudet,
      aloitusKuulutus,
      suunnitteluSopimus,
      euRahoitusLogot,
      aloitusKuulutusJulkaisut,
      velho,
      kielitiedot,
      vuorovaikutusKierros,
      vuorovaikutusKierrosJulkaisut,
      nahtavillaoloVaihe,
      nahtavillaoloVaiheJulkaisut,
      lausuntoPyynnot,
      lausuntoPyynnonTaydennykset,
      muokattavaHyvaksymisEsitys,
      julkaistuHyvaksymisEsitys,
      hyvaksymisPaatosVaihe,
      hyvaksymisPaatosVaiheJulkaisut,
      jatkoPaatos1Vaihe,
      jatkoPaatos1VaiheJulkaisut,
      jatkoPaatos2Vaihe,
      jatkoPaatos2VaiheJulkaisut,
      kasittelynTila,
      annetutMuistutukset,
      muistuttajat,
      muutMuistuttajat,
      oid,
      versio,
      euRahoitus,
      muistiinpano,
      paivitetty,
      vahainenMenettely,
      vaihe,
      omistajahaku,
      kustannuspaikka,
    } = dbProjekti;

    const projektiPath = new ProjektiPaths(dbProjekti.oid);
    let status: API.Status | undefined = undefined;
    if (dbProjekti.tallennettu) {
      status = await GetProjektiStatus.getProjektiStatus(dbProjekti);
    }
    const apiProjekti: API.Projekti = removeUndefinedFields({
      __typename: "Projekti",
      lyhytOsoite: dbProjekti.lyhytOsoite,
      tallennettu: !!dbProjekti.tallennettu,
      kayttoOikeudet: adaptDBVaylaUsertoAPIProjektiKayttaja(kayttoOikeudet),
      tyyppi: velho?.tyyppi ?? dbProjekti.tyyppi, // remove usage of projekti.tyyppi after all data has been migrated to new format
      aloitusKuulutus: adaptAloitusKuulutusToAPI(
        projektiPath.aloituskuulutus(aloitusKuulutus ?? undefined),
        kayttoOikeudet,
        aloitusKuulutus,
        aloitusKuulutusJulkaisut
      ),
      aloitusKuulutusJulkaisu: adaptAloitusKuulutusJulkaisuToAPI(dbProjekti, aloitusKuulutusJulkaisut),
      suunnitteluSopimus: adaptSuunnitteluSopimusToAPI(dbProjekti.oid, suunnitteluSopimus),
      euRahoitusLogot: adaptLogotToAPI(dbProjekti.oid, euRahoitusLogot),
      velho: adaptVelhoToAPI(velho),
      kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot, true),
      vuorovaikutusKierros: adaptVuorovaikutusKierrosToAPI(
        kayttoOikeudet,
        dbProjekti.oid,
        vuorovaikutusKierros,
        vuorovaikutusKierrosJulkaisut
      ),
      vuorovaikutusKierrosJulkaisut: adaptVuorovaikutusKierrosJulkaisutToAPI(dbProjekti, vuorovaikutusKierrosJulkaisut),
      nahtavillaoloVaihe: adaptNahtavillaoloVaiheToAPI(dbProjekti, nahtavillaoloVaihe, nahtavillaoloVaiheJulkaisut),
      nahtavillaoloVaiheJulkaisu: adaptNahtavillaoloVaiheJulkaisuToAPI(dbProjekti, nahtavillaoloVaiheJulkaisut),
      lausuntoPyynnot: adaptLausuntoPyynnotToAPI(dbProjekti, lausuntoPyynnot),
      lausuntoPyynnonTaydennykset: adaptLausuntoPyynnonTaydennyksetToAPI(dbProjekti, lausuntoPyynnonTaydennykset),
      hyvaksymisEsitys: adaptHyvaksymisEsitysToAPI({ oid, salt: dbProjekti.salt, muokattavaHyvaksymisEsitys, julkaistuHyvaksymisEsitys }),
      hyvaksymisPaatosVaihe: adaptHyvaksymisPaatosVaiheToAPI(
        kayttoOikeudet,
        hyvaksymisPaatosVaihe,
        dbProjekti.kasittelynTila?.hyvaksymispaatos,
        projektiPath.hyvaksymisPaatosVaihe(hyvaksymisPaatosVaihe),
        hyvaksymisPaatosVaiheJulkaisut
      ),
      hyvaksymisPaatosVaiheJulkaisu: adaptHyvaksymisPaatosVaiheJulkaisuToAPI(
        dbProjekti,
        dbProjekti.kasittelynTila?.hyvaksymispaatos,
        hyvaksymisPaatosVaiheJulkaisut,
        (julkaisu) => new ProjektiPaths(dbProjekti.oid).hyvaksymisPaatosVaihe(julkaisu)
      ),
      jatkoPaatos1Vaihe: adaptHyvaksymisPaatosVaiheToAPI(
        kayttoOikeudet,
        jatkoPaatos1Vaihe,
        dbProjekti.kasittelynTila?.ensimmainenJatkopaatos,
        projektiPath.jatkoPaatos1Vaihe(jatkoPaatos1Vaihe),
        jatkoPaatos1VaiheJulkaisut
      ),
      jatkoPaatos1VaiheJulkaisu: adaptHyvaksymisPaatosVaiheJulkaisuToAPI(
        dbProjekti,
        dbProjekti.kasittelynTila?.ensimmainenJatkopaatos,
        jatkoPaatos1VaiheJulkaisut,
        (julkaisu) => new ProjektiPaths(dbProjekti.oid).jatkoPaatos1Vaihe(julkaisu)
      ),
      jatkoPaatos2Vaihe: adaptHyvaksymisPaatosVaiheToAPI(
        kayttoOikeudet,
        jatkoPaatos2Vaihe,
        dbProjekti.kasittelynTila?.toinenJatkopaatos,
        projektiPath.jatkoPaatos2Vaihe(jatkoPaatos2Vaihe),
        jatkoPaatos2VaiheJulkaisut
      ),
      jatkoPaatos2VaiheJulkaisu: adaptHyvaksymisPaatosVaiheJulkaisuToAPI(
        dbProjekti,
        dbProjekti.kasittelynTila?.toinenJatkopaatos,
        jatkoPaatos2VaiheJulkaisut,
        (julkaisu) => new ProjektiPaths(dbProjekti.oid).jatkoPaatos2Vaihe(julkaisu)
      ),
      virhetiedot,
      kasittelynTila: adaptKasittelynTilaToAPI(kasittelynTila),
      muistutusMaara: (annetutMuistutukset?.length ?? 0) + (muistuttajat?.length ?? 0) + (muutMuistuttajat?.length ?? 0),
      asianhallinta: await adaptAsianhallinta(dbProjekti),
      oid,
      versio,
      euRahoitus,
      muistiinpano,
      paivitetty,
      vahainenMenettely,
      vaihe,
      omistajahaku: omistajahaku
        ? {
            __typename: "OmistajaHaku",
            status: omistajahaku.status,
            virhe: omistajahaku.virhe,
            kaynnistetty: omistajahaku.kaynnistetty,
            kiinteistotunnusMaara: omistajahaku.kiinteistotunnusMaara,
          }
        : undefined,
      kustannuspaikka,
      ennakkoNeuvottelu: await adaptEnnakkoNeuvotteluToAPI(dbProjekti, status),
      ennakkoNeuvotteluJulkaisu: await adaptEnnakkoNeuvotteluJulkaisuToAPI(dbProjekti, status),
    });

    if (apiProjekti.tallennettu) {
      apiProjekti.status = status;
      if (
        !apiProjekti.nahtavillaoloVaihe &&
        !apiProjekti.nahtavillaoloVaiheJulkaisu &&
        isStatusGreaterOrEqualTo(status, API.Status.NAHTAVILLAOLO_AINEISTOT)
      ) {
        apiProjekti.nahtavillaoloVaihe = { __typename: "NahtavillaoloVaihe", muokkausTila: API.MuokkausTila.MUOKKAUS };
      }
      if (
        !apiProjekti.hyvaksymisPaatosVaihe &&
        !apiProjekti.hyvaksymisPaatosVaiheJulkaisu &&
        isStatusGreaterOrEqualTo(status, API.Status.HYVAKSYMISMENETTELYSSA_AINEISTOT)
      ) {
        apiProjekti.hyvaksymisPaatosVaihe = { __typename: "HyvaksymisPaatosVaihe", muokkausTila: API.MuokkausTila.MUOKKAUS };
      }
      const apiProjektiJulkinen = await projektiAdapterJulkinen.adaptProjekti(dbProjekti);
      apiProjekti.julkinenStatus = apiProjektiJulkinen?.status;
      if (apiProjekti.asianhallinta) {
        apiProjekti.asianhallinta.linkkiAsianhallintaan = await getLinkkiAsianhallintaan(dbProjekti);
        if (checkAsianhallintaState) {
          apiProjekti.asianhallinta.aktiivinenTila = await haeAktiivisenVaiheenAsianhallinnanTila(apiProjekti);
        }
      }
    }

    return apiProjekti;
  }

  async adaptProjektiToPreview(projekti: DBProjekti, changes: API.TallennaProjektiInput): Promise<DBProjekti> {
    return mergeWith(projekti, (await this.adaptProjektiToSave(projekti, changes)).projekti, preventArrayMergingCustomizer);
  }

  async adaptProjektiToSave(projekti: DBProjekti, changes: API.TallennaProjektiInput): Promise<ProjektiAdaptationResult> {
    // Pick only fields that are relevant to DB
    const {
      oid,
      versio,
      muistiinpano,
      kayttoOikeudet,
      aloitusKuulutus,
      suunnitteluSopimus,
      kielitiedot,
      euRahoitus,
      euRahoitusLogot,
      vahainenMenettely,
      vuorovaikutusKierros,
      nahtavillaoloVaihe,
      lausuntoPyynnot,
      lausuntoPyynnonTaydennykset,
      kasittelynTila,
      hyvaksymisPaatosVaihe,
      jatkoPaatos1Vaihe,
      jatkoPaatos2Vaihe,
      asianhallinta,
      kustannuspaikka,
    } = changes;
    const projektiAdaptationResult: ProjektiAdaptationResult = new ProjektiAdaptationResult(projekti);
    const kayttoOikeudetManager = new KayttoOikeudetManager(
      projekti.kayttoOikeudet,
      await personSearch.getKayttajas(),
      projekti.suunnitteluSopimus?.yhteysHenkilo
    );
    kayttoOikeudetManager.applyChanges(kayttoOikeudet);
    const aloitusKuulutusToSave = adaptAloitusKuulutusToSave(projekti.aloitusKuulutus, aloitusKuulutus);

    const dbProjekti: DBProjekti = mergeWith({}, {
      oid,
      versio,
      muistiinpano,
      aloitusKuulutus: aloitusKuulutusToSave,
      suunnitteluSopimus: adaptSuunnitteluSopimusToSave(projekti, suunnitteluSopimus, projektiAdaptationResult),
      kayttoOikeudet: kayttoOikeudetManager.getKayttoOikeudet(),
      vuorovaikutusKierros: adaptVuorovaikutusKierrosToSave(projekti, vuorovaikutusKierros, projektiAdaptationResult),
      nahtavillaoloVaihe: adaptNahtavillaoloVaiheToSave(projekti.nahtavillaoloVaihe, nahtavillaoloVaihe, projektiAdaptationResult),
      lausuntoPyynnot: adaptLausuntoPyynnotToSave(projekti.lausuntoPyynnot, lausuntoPyynnot, projektiAdaptationResult),
      lausuntoPyynnonTaydennykset: adaptLausuntoPyynnonTaydennyksetToSave(
        projekti.lausuntoPyynnonTaydennykset,
        lausuntoPyynnonTaydennykset,
        projektiAdaptationResult
      ),
      hyvaksymisPaatosVaihe: adaptHyvaksymisPaatosVaiheToSave(
        projekti.hyvaksymisPaatosVaihe,
        hyvaksymisPaatosVaihe,
        projektiAdaptationResult
      ),
      jatkoPaatos1Vaihe: adaptHyvaksymisPaatosVaiheToSave(projekti.jatkoPaatos1Vaihe, jatkoPaatos1Vaihe, projektiAdaptationResult),
      jatkoPaatos2Vaihe: adaptHyvaksymisPaatosVaiheToSave(projekti.jatkoPaatos2Vaihe, jatkoPaatos2Vaihe, projektiAdaptationResult),
      kielitiedot,
      euRahoitus,
      euRahoitusLogot: adaptLogoFilesToSave(projekti.euRahoitusLogot, euRahoitusLogot, projektiAdaptationResult),
      vahainenMenettely,
      salt: projekti.salt ?? lisaAineistoService.generateSalt(),
      kasittelynTila: adaptKasittelynTilaToSave(projekti.kasittelynTila, kasittelynTila, projektiAdaptationResult),
      asianhallinta: asianhallinta ? { ...projekti.asianhallinta, inaktiivinen: asianhallinta.inaktiivinen } : undefined,
      kustannuspaikka,
    } as DBProjekti);

    projektiAdaptationResult.setProjekti(dbProjekti);
    return projektiAdaptationResult;
  }
}

function removeUndefinedFields(object: API.Projekti): API.Projekti {
  return {
    __typename: "Projekti",
    oid: object.oid,
    versio: object.versio,
    velho: object.velho,
    asianhallinta: object.asianhallinta,
    ...pickBy(object, (value) => value !== undefined),
  };
}

export const projektiAdapter = new ProjektiAdapter();
