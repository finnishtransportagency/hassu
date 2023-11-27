import { DBProjekti } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { KayttoOikeudetManager } from "../kayttoOikeudetManager";
import { personSearch } from "../../personSearch/personSearchClient";
import pickBy from "lodash/pickBy";
import { lisaAineistoService } from "../../tiedostot/lisaAineistoService";
import { adaptKielitiedotByAddingTypename, adaptVelho } from "./common";
import {
  adaptAloitusKuulutus,
  adaptAloitusKuulutusJulkaisu,
  adaptHyvaksymisPaatosVaihe,
  adaptHyvaksymisPaatosVaiheJulkaisu,
  adaptKasittelynTila,
  adaptLausuntoPyynnonTaydennykset,
  adaptLausuntoPyynnot,
  adaptLogot,
  adaptNahtavillaoloVaihe,
  adaptNahtavillaoloVaiheJulkaisu,
  adaptSuunnitteluSopimus,
  adaptVuorovaikutusKierros,
  adaptVuorovaikutusKierrosJulkaisut,
} from "./adaptToAPI";
import {
  adaptAloitusKuulutusToSave,
  adaptHyvaksymisPaatosVaiheToSave,
  adaptLokalisoituTekstiEiPakollinen,
  adaptNahtavillaoloVaiheToSave,
  adaptSuunnitteluSopimusToSave,
  adaptVuorovaikutusKierrosToSave,
} from "./adaptToDB";
import { applyProjektiStatus } from "../status/projektiStatusHandler";
import { projektiAdapterJulkinen } from "./projektiAdapterJulkinen";
import { adaptKasittelynTilaToSave } from "./adaptToDB/adaptKasittelynTilaToSave";
import { ProjektiAdaptationResult } from "./projektiAdaptationResult";
import { ProjektiPaths } from "../../files/ProjektiPath";
import { preventArrayMergingCustomizer } from "../../util/preventArrayMergingCustomizer";
import { haeAktiivisenVaiheenAsianhallinnanTila } from "./haeAktiivisenVaiheenAsianhallinnanTila";
import { adaptAsianhallinta } from "./adaptAsianhallinta";
import { adaptLausuntoPyynnonTaydennyksetToSave, adaptLausuntoPyynnotToSave } from "./adaptToDB/adaptLausuntoPyynnotToSave";

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
      hyvaksymisPaatosVaihe,
      hyvaksymisPaatosVaiheJulkaisut,
      jatkoPaatos1Vaihe,
      jatkoPaatos1VaiheJulkaisut,
      jatkoPaatos2Vaihe,
      jatkoPaatos2VaiheJulkaisut,
      salt: _salt,
      kasittelynTila,
      annetutMuistutukset,
      asianhallinta: _asianhallinta,
      ...fieldsToCopyAsIs
    } = dbProjekti;

    const projektiPath = new ProjektiPaths(dbProjekti.oid);
    const apiProjekti: API.Projekti = removeUndefinedFields({
      __typename: "Projekti",
      lyhytOsoite: dbProjekti.lyhytOsoite,
      tallennettu: !!dbProjekti.tallennettu,
      kayttoOikeudet: KayttoOikeudetManager.adaptAPIKayttoOikeudet(kayttoOikeudet),
      tyyppi: velho?.tyyppi ?? dbProjekti.tyyppi, // remove usage of projekti.tyyppi after all data has been migrated to new format
      aloitusKuulutus: adaptAloitusKuulutus(
        projektiPath.aloituskuulutus(aloitusKuulutus ?? undefined),
        kayttoOikeudet,
        aloitusKuulutus,
        aloitusKuulutusJulkaisut
      ),
      aloitusKuulutusJulkaisu: adaptAloitusKuulutusJulkaisu(dbProjekti, aloitusKuulutusJulkaisut),
      suunnitteluSopimus: adaptSuunnitteluSopimus(dbProjekti.oid, suunnitteluSopimus),
      euRahoitusLogot: adaptLogot(dbProjekti.oid, euRahoitusLogot),
      velho: adaptVelho(velho),
      kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot, true),
      vuorovaikutusKierros: adaptVuorovaikutusKierros(kayttoOikeudet, dbProjekti.oid, vuorovaikutusKierros, vuorovaikutusKierrosJulkaisut),
      vuorovaikutusKierrosJulkaisut: adaptVuorovaikutusKierrosJulkaisut(dbProjekti, vuorovaikutusKierrosJulkaisut),
      nahtavillaoloVaihe: adaptNahtavillaoloVaihe(dbProjekti, nahtavillaoloVaihe, nahtavillaoloVaiheJulkaisut),
      nahtavillaoloVaiheJulkaisu: adaptNahtavillaoloVaiheJulkaisu(dbProjekti, nahtavillaoloVaiheJulkaisut),
      lausuntoPyynnot: adaptLausuntoPyynnot(dbProjekti, lausuntoPyynnot),
      lausuntoPyynnonTaydennykset: adaptLausuntoPyynnonTaydennykset(dbProjekti, lausuntoPyynnonTaydennykset),
      hyvaksymisPaatosVaihe: adaptHyvaksymisPaatosVaihe(
        kayttoOikeudet,
        hyvaksymisPaatosVaihe,
        dbProjekti.kasittelynTila?.hyvaksymispaatos,
        projektiPath.hyvaksymisPaatosVaihe(hyvaksymisPaatosVaihe),
        hyvaksymisPaatosVaiheJulkaisut
      ),
      hyvaksymisPaatosVaiheJulkaisu: adaptHyvaksymisPaatosVaiheJulkaisu(
        dbProjekti,
        dbProjekti.kasittelynTila?.hyvaksymispaatos,
        hyvaksymisPaatosVaiheJulkaisut,
        (julkaisu) => new ProjektiPaths(dbProjekti.oid).hyvaksymisPaatosVaihe(julkaisu)
      ),
      jatkoPaatos1Vaihe: adaptHyvaksymisPaatosVaihe(
        kayttoOikeudet,
        jatkoPaatos1Vaihe,
        dbProjekti.kasittelynTila?.ensimmainenJatkopaatos,
        projektiPath.jatkoPaatos1Vaihe(jatkoPaatos1Vaihe),
        jatkoPaatos1VaiheJulkaisut
      ),
      jatkoPaatos1VaiheJulkaisu: adaptHyvaksymisPaatosVaiheJulkaisu(
        dbProjekti,
        dbProjekti.kasittelynTila?.ensimmainenJatkopaatos,
        jatkoPaatos1VaiheJulkaisut,
        (julkaisu) => new ProjektiPaths(dbProjekti.oid).jatkoPaatos1Vaihe(julkaisu)
      ),
      jatkoPaatos2Vaihe: adaptHyvaksymisPaatosVaihe(
        kayttoOikeudet,
        jatkoPaatos2Vaihe,
        dbProjekti.kasittelynTila?.toinenJatkopaatos,
        projektiPath.jatkoPaatos2Vaihe(jatkoPaatos2Vaihe),
        jatkoPaatos2VaiheJulkaisut
      ),
      jatkoPaatos2VaiheJulkaisu: adaptHyvaksymisPaatosVaiheJulkaisu(
        dbProjekti,
        dbProjekti.kasittelynTila?.toinenJatkopaatos,
        jatkoPaatos2VaiheJulkaisut,
        (julkaisu) => new ProjektiPaths(dbProjekti.oid).jatkoPaatos2Vaihe(julkaisu)
      ),
      virhetiedot,
      kasittelynTila: adaptKasittelynTila(kasittelynTila),
      muistutusMaara: annetutMuistutukset?.length,
      asianhallinta: await adaptAsianhallinta(dbProjekti),
      ...fieldsToCopyAsIs,
    });

    if (apiProjekti.tallennettu) {
      applyProjektiStatus(apiProjekti);
      const apiProjektiJulkinen = await projektiAdapterJulkinen.adaptProjekti(dbProjekti);
      apiProjekti.julkinenStatus = apiProjektiJulkinen?.status;
      if (apiProjekti.asianhallinta && checkAsianhallintaState) {
        apiProjekti.asianhallinta.aktiivinenTila = await haeAktiivisenVaiheenAsianhallinnanTila(apiProjekti);
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
      euRahoitusLogot: adaptLokalisoituTekstiEiPakollinen(projekti.euRahoitusLogot, euRahoitusLogot, projektiAdaptationResult),
      vahainenMenettely,
      salt: projekti.salt ?? lisaAineistoService.generateSalt(),
      kasittelynTila: adaptKasittelynTilaToSave(projekti.kasittelynTila, kasittelynTila, projektiAdaptationResult),
      asianhallinta,
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
