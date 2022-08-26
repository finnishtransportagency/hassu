import { DBProjekti, Yhteystieto } from "../database/model";
import * as API from "../../../common/graphql/apiModel";
import { NahtavillaoloVaiheTila } from "../../../common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";
import { personSearch } from "../personSearch/personSearchClient";
import pickBy from "lodash/pickBy";
import { perustiedotValidationSchema } from "../../../src/schemas/perustiedot";
import { ValidationError } from "yup";
import { log } from "../logger";
import dayjs from "dayjs";
import { kayttoOikeudetSchema } from "../../../src/schemas/kayttoOikeudet";
import { lisaAineistoService } from "../aineisto/lisaAineistoService";
import { ISO_DATE_FORMAT, parseDate } from "../util/dateUtil";
import adaptKasittelynTila from "./adaptProjektiUtil/adaptKasittelynTila";
import {
  adaptLiittyvatSuunnitelmat as lisaaSuunnitelmatTypename,
  adaptKielitiedot as lisaaKielitiedotTypename,
} from "./commonAdapterUtil/lisaaTypename";
import adaptSuunnitteluVaihe from "./adaptProjektiUtil/adaptSuunnitteluVaihe";
import { adaptNahtavillaoloVaihe, adaptNahtavillaoloVaiheJulkaisut } from "./adaptProjektiUtil/adaptNahtavillaoloVaihe";
import {
  adaptHyvaksymisPaatosVaihe,
  adaptHyvaksymisPaatosVaiheJulkaisut,
} from "./adaptProjektiUtil/adaptHyvaksymisPaatosVaihe";
import { adaptAloitusKuulutus, adaptAloitusKuulutusJulkaisut } from "./adaptProjektiUtil/adaptAloitusKuulutus";
import { adaptSuunnitteluSopimus } from "./adaptProjektiUtil/adaptSuunitteluSopimus";
import { adaptVuorovaikutusToSave } from "./adaptProjektiToSaveUtil/adaptVuorovaikutusToSave";
import { adaptAloitusKuulutusToSave } from "./adaptProjektiToSaveUtil/adaptAloitusKuulutusToSave";
import { adaptSuunnitteluSopimusToSave } from "./adaptProjektiToSaveUtil/adaptSuunnitteluSopimusToSave";
import { adaptSuunnitteluVaiheToSave } from "./adaptProjektiToSaveUtil/adaptSuunnitteluVaiheToSave";
import { adaptNahtavillaoloVaiheToSave } from "./adaptProjektiToSaveUtil/adaptNahtavillaoloVaiheToSave";
import { adaptHyvaksymisPaatosVaiheToSave } from "./adaptProjektiToSaveUtil/adaptHyvaksymisPaatosVaiheToSave";
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

  async onEvent(
    eventType: ProjektiEventType,
    eventHandler: (event: ProjektiEvent, projekti: DBProjekti) => Promise<void>
  ): Promise<void> {
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
      palautteet,
      nahtavillaoloVaihe,
      nahtavillaoloVaiheJulkaisut,
      hyvaksymisPaatosVaihe,
      hyvaksymisPaatosVaiheJulkaisut,
      salt: _salt,
      kasittelynTila,
      ...fieldsToCopyAsIs
    } = dbProjekti;

    // Määritä projektipäällikkö ja muotoile se Yhteystieto-objektiksi.
    const projektiPaallikkoVaylaDBUserina = kayttoOikeudet.find((hlo) => hlo.email === velho.vastuuhenkilonEmail);
    const { nimi, email, ...ppIlmanNimea } = projektiPaallikkoVaylaDBUserina;
    const projektiPaallikko: Yhteystieto = {
      ...ppIlmanNimea,
      etunimi: nimi.split(",")[0].trim(),
      sukunimi: nimi.split(",")[1].trim(),
      sahkoposti: email,
    };

    const apiProjekti = removeUndefinedFields({
      __typename: "Projekti",
      tallennettu: !!dbProjekti.tallennettu,
      kayttoOikeudet: KayttoOikeudetManager.adaptAPIKayttoOikeudet(kayttoOikeudet),
      tyyppi: velho?.tyyppi || dbProjekti.tyyppi, // remove usage of projekti.tyyppi after all data has been migrated to new format
      aloitusKuulutus: adaptAloitusKuulutus(projektiPaallikko, aloitusKuulutus),
      suunnitteluSopimus: adaptSuunnitteluSopimus(dbProjekti.oid, suunnitteluSopimus),
      liittyvatSuunnitelmat: lisaaSuunnitelmatTypename(liittyvatSuunnitelmat),
      aloitusKuulutusJulkaisut: adaptAloitusKuulutusJulkaisut(
        dbProjekti.oid,
        projektiPaallikko,
        aloitusKuulutusJulkaisut
      ),
      velho: {
        __typename: "Velho",
        ...velho,
      },
      kielitiedot: lisaaKielitiedotTypename(kielitiedot),
      suunnitteluVaihe: adaptSuunnitteluVaihe(
        dbProjekti.oid,
        projektiPaallikko,
        suunnitteluVaihe,
        vuorovaikutukset,
        palautteet
      ),
      nahtavillaoloVaihe: adaptNahtavillaoloVaihe(projektiPaallikko, dbProjekti, nahtavillaoloVaihe),
      nahtavillaoloVaiheJulkaisut: adaptNahtavillaoloVaiheJulkaisut(
        dbProjekti.oid,
        projektiPaallikko,
        nahtavillaoloVaiheJulkaisut
      ),
      hyvaksymisPaatosVaihe: adaptHyvaksymisPaatosVaihe(
        projektiPaallikko,
        dbProjekti,
        hyvaksymisPaatosVaihe,
        dbProjekti.kasittelynTila?.hyvaksymispaatos
      ),
      hyvaksymisPaatosVaiheJulkaisut: adaptHyvaksymisPaatosVaiheJulkaisut(
        dbProjekti.oid,
        projektiPaallikko,
        dbProjekti.kasittelynTila?.hyvaksymispaatos,
        hyvaksymisPaatosVaiheJulkaisut
      ),
      virhetiedot,
      kasittelynTila: adaptKasittelynTila(kasittelynTila),
      ...fieldsToCopyAsIs,
    }) as API.Projekti;
    if (apiProjekti.tallennettu) {
      this.applyStatus(apiProjekti);
    }
    return apiProjekti;
  }

  async adaptProjektiToPreview(projekti: DBProjekti, changes: API.TallennaProjektiInput): Promise<DBProjekti> {
    return mergeWith(projekti, (await this.adaptProjektiToSave(projekti, changes)).projekti);
  }

  async adaptProjektiToSave(
    projekti: DBProjekti,
    changes: API.TallennaProjektiInput
  ): Promise<ProjektiAdaptationResult> {
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
    const vuorovaikutukset = adaptVuorovaikutusToSave(
      projekti,
      projektiAdaptationResult,
      suunnitteluVaihe?.vuorovaikutus
    );
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

  /**
   * Function to determine the status of the projekti
   * @param projekti
   */
  private applyStatus(projekti: API.Projekti): API.Projekti {
    function checkPerustiedot() {
      try {
        kayttoOikeudetSchema.validateSync(projekti.kayttoOikeudet);
      } catch (e) {
        if (e instanceof ValidationError) {
          log.info("Käyttöoikeudet puutteelliset", e);
          projekti.status = API.Status.EI_JULKAISTU_PROJEKTIN_HENKILOT;
          return true; // This is the final status
        } else {
          throw e;
        }
      }
      try {
        perustiedotValidationSchema.validateSync(projekti);
      } catch (e) {
        if (e instanceof ValidationError) {
          log.info("Perustiedot puutteelliset", e.errors);
          return true; // This is the final status
        } else {
          throw e;
        }
      }

      if (!projekti.aloitusKuulutus) {
        projekti.aloitusKuulutus = { __typename: "AloitusKuulutus" };
      }
      projekti.status = API.Status.ALOITUSKUULUTUS;
    }

    function checkSuunnittelu() {
      if (projekti.aloitusKuulutusJulkaisut) {
        projekti.status = API.Status.SUUNNITTELU;
      }
    }

    function checkNahtavillaolo() {
      if (projekti.suunnitteluVaihe?.julkinen) {
        projekti.status = API.Status.NAHTAVILLAOLO;
      }
    }

    function checkHyvaksymisMenettelyssa() {
      const hyvaksymisPaatos = projekti.kasittelynTila?.hyvaksymispaatos;
      const hasHyvaksymisPaatos = hyvaksymisPaatos && hyvaksymisPaatos.asianumero && hyvaksymisPaatos.paatoksenPvm;

      const nahtavillaoloVaihe = projekti.nahtavillaoloVaiheJulkaisut
        ?.filter((julkaisu) => julkaisu.tila == NahtavillaoloVaiheTila.HYVAKSYTTY)
        .pop();
      const nahtavillaoloKuulutusPaattyyInThePast = isDateInThePast(nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva);

      if (hasHyvaksymisPaatos && nahtavillaoloKuulutusPaattyyInThePast) {
        projekti.status = API.Status.HYVAKSYMISMENETTELYSSA;
      }
    }

    // Perustiedot is available if the projekti has been saved
    projekti.tallennettu = true;
    projekti.status = API.Status.EI_JULKAISTU;

    // Aloituskuulutus is available, if projekti has all basic information set
    if (checkPerustiedot()) {
      return projekti;
    }

    checkSuunnittelu();

    checkNahtavillaolo();

    checkHyvaksymisMenettelyssa();

    return projekti;
  }
}

function removeUndefinedFields(object: API.Projekti): Partial<API.Projekti> {
  return pickBy(object, (value) => value !== undefined);
}

export function isDateInThePast(kuulutusVaihePaattyyPaiva: string | undefined): boolean {
  if (kuulutusVaihePaattyyPaiva) {
    // Support times as well for testing, so do not set the time if it was already provided
    let date = parseDate(kuulutusVaihePaattyyPaiva);
    if (kuulutusVaihePaattyyPaiva.length == ISO_DATE_FORMAT.length) {
      date = date.set("hour", 23).set("minute", 59);
    }
    return date.isBefore(dayjs());
  }
  return false;
}

export const projektiAdapter = new ProjektiAdapter();
