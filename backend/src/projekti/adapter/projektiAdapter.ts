import { DBProjekti } from "../../database/model";
import * as API from "../../../../common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { KayttoOikeudetManager } from "../kayttoOikeudetManager";
import { personSearch } from "../../personSearch/personSearchClient";
import pickBy from "lodash/pickBy";
import { lisaAineistoService } from "../../aineisto/lisaAineistoService";
import { adaptKielitiedotByAddingTypename, adaptLiittyvatSuunnitelmatByAddingTypename } from "./common";
import {
  adaptAloitusKuulutus,
  adaptAloitusKuulutusJulkaisut,
  adaptHyvaksymisPaatosVaihe,
  adaptHyvaksymisPaatosVaiheJulkaisut,
  adaptKasittelynTila,
  adaptNahtavillaoloVaihe,
  adaptNahtavillaoloVaiheJulkaisut,
  adaptSuunnitteluSopimus,
  adaptSuunnitteluVaihe,
} from "./adaptToAPI";
import {
  adaptAloitusKuulutusToSave,
  adaptHyvaksymisPaatosVaiheToSave,
  adaptNahtavillaoloVaiheToSave,
  adaptSuunnitteluSopimusToSave,
  adaptSuunnitteluVaiheToSave,
  adaptVuorovaikutusToSave,
} from "./adaptToDB";
import { applyProjektiStatus } from "../status/projektiStatusHandler";

export enum ProjektiEventType {
  VUOROVAIKUTUS_PUBLISHED = "VUOROVAIKUTUS_PUBLISHED",
  AINEISTO_CHANGED = "AINEISTO_CHANGED",
}

export type VuorovaikutusPublishedEvent = {
  eventType: ProjektiEventType.VUOROVAIKUTUS_PUBLISHED;
  vuorovaikutusNumero: number;
};

export type AineistoChangedEvent = { eventType: ProjektiEventType.AINEISTO_CHANGED };

export type ProjektiEvent = VuorovaikutusPublishedEvent | AineistoChangedEvent;

export class ProjektiAdaptationResult {
  private dbProjekti: DBProjekti;
  private events: ProjektiEvent[] = [];

  setProjekti(dbProjekti: DBProjekti): void {
    this.dbProjekti = dbProjekti;
  }

  pushEvent(event: ProjektiEvent): void {
    if (!this.events.find((e) => e.eventType == event.eventType)) {
      this.events.push(event);
    }
  }

  get projekti(): DBProjekti {
    return this.dbProjekti;
  }

  async onEvent(eventType: ProjektiEventType, eventHandler: (event: ProjektiEvent, projekti: DBProjekti) => Promise<void>): Promise<void> {
    for (const event of this.events) {
      if (event.eventType == eventType) {
        await eventHandler(event, this.projekti);
      }
    }
  }
}

export class ProjektiAdapter {
  public adaptProjekti(dbProjekti: DBProjekti, virhetiedot?: API.ProjektiVirhe): API.Projekti {
    const {
      kayttoOikeudet,
      aloitusKuulutus,
      suunnitteluSopimus,
      liittyvatSuunnitelmat,
      aloitusKuulutusJulkaisut,
      velho,
      kielitiedot,
      suunnitteluVaihe,
      vuorovaikutukset,
      nahtavillaoloVaihe,
      nahtavillaoloVaiheJulkaisut,
      hyvaksymisPaatosVaihe,
      hyvaksymisPaatosVaiheJulkaisut,
      jatkoPaatos1Vaihe,
      jatkoPaatos1VaiheJulkaisut,
      jatkoPaatos2Vaihe,
      jatkoPaatos2VaiheJulkaisut,
      salt: _salt,
      kasittelynTila,
      ...fieldsToCopyAsIs
    } = dbProjekti;

    const apiProjekti = removeUndefinedFields({
      __typename: "Projekti",
      tallennettu: !!dbProjekti.tallennettu,
      kayttoOikeudet: KayttoOikeudetManager.adaptAPIKayttoOikeudet(kayttoOikeudet),
      tyyppi: velho?.tyyppi || dbProjekti.tyyppi, // remove usage of projekti.tyyppi after all data has been migrated to new format
      aloitusKuulutus: adaptAloitusKuulutus(aloitusKuulutus),
      suunnitteluSopimus: adaptSuunnitteluSopimus(dbProjekti.oid, suunnitteluSopimus),
      liittyvatSuunnitelmat: adaptLiittyvatSuunnitelmatByAddingTypename(liittyvatSuunnitelmat),
      aloitusKuulutusJulkaisut: adaptAloitusKuulutusJulkaisut(dbProjekti.oid, aloitusKuulutusJulkaisut),
      velho: {
        __typename: "Velho",
        ...velho,
      },
      kielitiedot: adaptKielitiedotByAddingTypename(kielitiedot),
      suunnitteluVaihe: adaptSuunnitteluVaihe(dbProjekti.oid, kayttoOikeudet, suunnitteluVaihe, vuorovaikutukset),
      nahtavillaoloVaihe: adaptNahtavillaoloVaihe(dbProjekti, nahtavillaoloVaihe),
      nahtavillaoloVaiheJulkaisut: adaptNahtavillaoloVaiheJulkaisut(dbProjekti.oid, nahtavillaoloVaiheJulkaisut),
      hyvaksymisPaatosVaihe: adaptHyvaksymisPaatosVaihe(dbProjekti, hyvaksymisPaatosVaihe, dbProjekti.kasittelynTila?.hyvaksymispaatos),
      hyvaksymisPaatosVaiheJulkaisut: adaptHyvaksymisPaatosVaiheJulkaisut(
        dbProjekti.oid,
        dbProjekti.kasittelynTila?.hyvaksymispaatos,
        hyvaksymisPaatosVaiheJulkaisut
      ),
      jatkoPaatos1Vaihe: adaptHyvaksymisPaatosVaihe(dbProjekti, jatkoPaatos1Vaihe, dbProjekti.kasittelynTila?.ensimmainenJatkopaatos),
      jatkoPaatos1VaiheJulkaisut: adaptHyvaksymisPaatosVaiheJulkaisut(
        dbProjekti.oid,
        dbProjekti.kasittelynTila?.ensimmainenJatkopaatos,
        jatkoPaatos1VaiheJulkaisut
      ),
      jatkoPaatos2Vaihe: adaptHyvaksymisPaatosVaihe(dbProjekti, jatkoPaatos2Vaihe, dbProjekti.kasittelynTila?.toinenJatkopaatos),
      jatkoPaatos2VaiheJulkaisut: adaptHyvaksymisPaatosVaiheJulkaisut(
        dbProjekti.oid,
        dbProjekti.kasittelynTila?.toinenJatkopaatos,
        jatkoPaatos2VaiheJulkaisut
      ),
      virhetiedot,
      kasittelynTila: adaptKasittelynTila(kasittelynTila),
      ...fieldsToCopyAsIs,
    }) as API.Projekti;
    if (apiProjekti.tallennettu) {
      applyProjektiStatus(apiProjekti);
    }
    return apiProjekti;
  }

  async adaptProjektiToPreview(projekti: DBProjekti, changes: API.TallennaProjektiInput): Promise<DBProjekti> {
    return mergeWith(projekti, (await this.adaptProjektiToSave(projekti, changes)).projekti);
  }

  async adaptProjektiToSave(projekti: DBProjekti, changes: API.TallennaProjektiInput): Promise<ProjektiAdaptationResult> {
    // Pick only fields that are relevant to DB
    const {
      oid,
      muistiinpano,
      kayttoOikeudet,
      aloitusKuulutus,
      suunnitteluSopimus,
      kielitiedot,
      euRahoitus,
      liittyvatSuunnitelmat,
      suunnitteluVaihe,
      nahtavillaoloVaihe,
      kasittelynTila,
      hyvaksymisPaatosVaihe,
    } = changes;
    const projektiAdaptationResult: ProjektiAdaptationResult = new ProjektiAdaptationResult();
    const kayttoOikeudetManager = new KayttoOikeudetManager(projekti.kayttoOikeudet, await personSearch.getKayttajas());
    kayttoOikeudetManager.applyChanges(kayttoOikeudet);
    const vuorovaikutukset = adaptVuorovaikutusToSave(projekti, projektiAdaptationResult, suunnitteluVaihe?.vuorovaikutus);
    const aloitusKuulutusToSave = adaptAloitusKuulutusToSave(aloitusKuulutus);
    const dbProjekti = mergeWith(
      {},
      {
        oid,
        muistiinpano,
        aloitusKuulutus: aloitusKuulutusToSave,
        suunnitteluSopimus: adaptSuunnitteluSopimusToSave(projekti, suunnitteluSopimus),
        kayttoOikeudet: kayttoOikeudetManager.getKayttoOikeudet(),
        suunnitteluVaihe: adaptSuunnitteluVaiheToSave(projekti, suunnitteluVaihe),
        nahtavillaoloVaihe: adaptNahtavillaoloVaiheToSave(
          projekti.nahtavillaoloVaihe,
          nahtavillaoloVaihe,
          projektiAdaptationResult,
          projekti.nahtavillaoloVaiheJulkaisut?.length
        ),
        hyvaksymisPaatosVaihe: adaptHyvaksymisPaatosVaiheToSave(
          projekti.hyvaksymisPaatosVaihe,
          hyvaksymisPaatosVaihe,
          projektiAdaptationResult,
          projekti.hyvaksymisPaatosVaiheJulkaisut?.length
        ),
        kielitiedot,
        euRahoitus,
        liittyvatSuunnitelmat,
        vuorovaikutukset,
        salt: projekti.salt || lisaAineistoService.generateSalt(),
        kasittelynTila,
      }
    ) as DBProjekti;
    projektiAdaptationResult.setProjekti(dbProjekti);
    return projektiAdaptationResult;
  }
}

function removeUndefinedFields(object: API.Projekti): Partial<API.Projekti> {
  return pickBy(object, (value) => value !== undefined);
}

export const projektiAdapter = new ProjektiAdapter();
