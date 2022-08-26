import {
  Aineisto,
  AloitusKuulutus,
  AloitusKuulutusJulkaisu,
  DBProjekti,
  HyvaksymisPaatosVaihe,
  LocalizedMap,
  NahtavillaoloVaihe,
  SuunnitteluVaihe,
  Vuorovaikutus,
  VuorovaikutusTilaisuus,
  Yhteystieto,
} from "../database/model";
import * as API from "../../../common/graphql/apiModel";
import { NahtavillaoloVaiheTila } from "../../../common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";
import { personSearch } from "../personSearch/personSearchClient";
import pickBy from "lodash/pickBy";
import remove from "lodash/remove";
import { perustiedotValidationSchema } from "../../../src/schemas/perustiedot";
import { ValidationError } from "yup";
import { log } from "../logger";
import dayjs from "dayjs";
import { kayttoOikeudetSchema } from "../../../src/schemas/kayttoOikeudet";
import { lisaAineistoService } from "../aineisto/lisaAineistoService";
import { IllegalArgumentError } from "../error/IllegalArgumentError";
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
import { adaptHankkeenKuvaus } from "./commonAdapterUtil/adaptHankkeenKuvaus";
import { adaptAloitusKuulutus, adaptAloitusKuulutusJulkaisut } from "./adaptProjektiUtil/adaptAloitusKuulutus";
import { adaptSuunnitteluSopimus } from "./adaptProjektiUtil/adaptSuunitteluSopimus";

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

function adaptSuunnitteluVaiheToSave(
  dbProjekti: DBProjekti,
  suunnitteluVaihe: API.SuunnitteluVaiheInput
): SuunnitteluVaihe {
  function validateSuunnitteluVaihePublishing() {
    const isSuunnitteluVaiheBeingPublished = !dbProjekti.suunnitteluVaihe?.julkinen && suunnitteluVaihe.julkinen;
    if (isSuunnitteluVaiheBeingPublished) {
      // Publishing is allowed only if there is a published aloituskuulutusjulkaisu
      if (!findPublishedAloitusKuulutusJulkaisu(dbProjekti.aloitusKuulutusJulkaisut)) {
        throw new IllegalArgumentError("Suunnitteluvaihetta ei voi julkaista ennen kuin aloituskuulutus on julkaistu");
      }
    }
  }

  if (
    suunnitteluVaihe &&
    (suunnitteluVaihe.arvioSeuraavanVaiheenAlkamisesta ||
      suunnitteluVaihe.hankkeenKuvaus ||
      suunnitteluVaihe.suunnittelunEteneminenJaKesto)
  ) {
    validateSuunnitteluVaihePublishing();

    const {
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      hankkeenKuvaus,
      julkinen,
      palautteidenVastaanottajat,
    } = suunnitteluVaihe;
    return {
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      hankkeenKuvaus: hankkeenKuvaus ? adaptHankkeenKuvaus(hankkeenKuvaus) : undefined,
      julkinen,
      palautteidenVastaanottajat,
    };
  }
  return undefined;
}

function adaptNahtavillaoloVaiheToSave(
  dbNahtavillaoloVaihe: NahtavillaoloVaihe,
  nahtavillaoloVaihe: API.NahtavillaoloVaiheInput,
  projektiAdaptationResult: ProjektiAdaptationResult,
  nahtavillaoloVaiheJulkaisutCount: number | undefined
): NahtavillaoloVaihe {
  if (!nahtavillaoloVaihe) {
    return undefined;
  }
  const {
    aineistoNahtavilla: aineistoNahtavillaInput,
    lisaAineisto: lisaAineistoInput,
    kuulutusYhteystiedot,
    ilmoituksenVastaanottajat,
    hankkeenKuvaus,
    kuulutusPaiva,
    kuulutusVaihePaattyyPaiva,
    muistutusoikeusPaattyyPaiva,
    kuulutusYhteysHenkilot,
  } = nahtavillaoloVaihe;

  const aineistoNahtavilla = adaptAineistotToSave(
    dbNahtavillaoloVaihe?.aineistoNahtavilla,
    aineistoNahtavillaInput,
    projektiAdaptationResult
  );

  const lisaAineisto = adaptAineistotToSave(
    dbNahtavillaoloVaihe?.lisaAineisto,
    lisaAineistoInput,
    projektiAdaptationResult
  );

  let id = dbNahtavillaoloVaihe?.id;
  if (!id) {
    if (nahtavillaoloVaiheJulkaisutCount) {
      id = nahtavillaoloVaiheJulkaisutCount + 1;
    } else {
      id = 1;
    }
  }

  return mergeWith({}, dbNahtavillaoloVaihe, {
    kuulutusPaiva,
    kuulutusVaihePaattyyPaiva,
    muistutusoikeusPaattyyPaiva,
    kuulutusYhteysHenkilot,
    id,
    aineistoNahtavilla,
    lisaAineisto,
    kuulutusYhteystiedot: adaptYhteystiedotToSave(kuulutusYhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToSave(ilmoituksenVastaanottajat),
    hankkeenKuvaus: adaptHankkeenKuvausToSave(hankkeenKuvaus),
  } as NahtavillaoloVaihe);
}

function adaptHyvaksymisPaatosVaiheToSave(
  dbHyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe,
  hyvaksymisPaatosVaihe: API.HyvaksymisPaatosVaiheInput,
  projektiAdaptationResult: ProjektiAdaptationResult,
  hyvaksymisPaatosVaiheJulkaisutCount: number | undefined
): HyvaksymisPaatosVaihe {
  if (!hyvaksymisPaatosVaihe) {
    return undefined;
  }
  const {
    hyvaksymisPaatos: hyvaksymisPaatosInput,
    aineistoNahtavilla: aineistoNahtavillaInput,
    kuulutusYhteystiedot,
    ilmoituksenVastaanottajat,
    kuulutusPaiva,
    kuulutusVaihePaattyyPaiva,
    kuulutusYhteysHenkilot,
    hallintoOikeus,
  } = hyvaksymisPaatosVaihe;

  const aineistoNahtavilla = adaptAineistotToSave(
    dbHyvaksymisPaatosVaihe?.aineistoNahtavilla,
    aineistoNahtavillaInput,
    projektiAdaptationResult
  );

  const hyvaksymisPaatos = adaptAineistotToSave(
    dbHyvaksymisPaatosVaihe?.hyvaksymisPaatos,
    hyvaksymisPaatosInput,
    projektiAdaptationResult
  );

  let id = dbHyvaksymisPaatosVaihe?.id;
  if (!id) {
    if (hyvaksymisPaatosVaiheJulkaisutCount) {
      id = hyvaksymisPaatosVaiheJulkaisutCount + 1;
    } else {
      id = 1;
    }
  }

  const newChanges: HyvaksymisPaatosVaihe = {
    kuulutusPaiva,
    kuulutusVaihePaattyyPaiva,
    kuulutusYhteysHenkilot,
    id,
    hyvaksymisPaatos,
    aineistoNahtavilla,
    kuulutusYhteystiedot: adaptYhteystiedotToSave(kuulutusYhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToSave(ilmoituksenVastaanottajat),
    hallintoOikeus,
  };
  return mergeWith({}, dbHyvaksymisPaatosVaihe, newChanges);
}

function adaptYhteystiedotToSave(yhteystietoInputs: Array<API.YhteystietoInput>) {
  return yhteystietoInputs?.length > 0 ? yhteystietoInputs.map((yt) => ({ ...yt })) : undefined;
}

function adaptKayttajatunnusList(
  projekti: DBProjekti,
  yhteysHenkilot: Array<string>,
  doNotForceProjektipaallikko?: boolean
): string[] | undefined {
  if (!yhteysHenkilot || yhteysHenkilot.length == 0) {
    return undefined;
  }
  // Include only usernames that can be found from projekti
  const unfilteredList = yhteysHenkilot.map((yh) => {
    const projektiUser = projekti.kayttoOikeudet.find((value) => value.kayttajatunnus == yh);
    if (projektiUser) {
      return yh;
    } else {
      return undefined;
    }
  });

  // Users with PROJEKTIPAALLIKKO role should always be in the kayttajaTunnusList
  // Push PROJEKTIPAALLIKKO into the list if not there already
  const projektipaallikkonTunnus = projekti.kayttoOikeudet?.find(
    ({ rooli }) => rooli === API.ProjektiRooli.PROJEKTIPAALLIKKO
  )?.kayttajatunnus;
  if (!doNotForceProjektipaallikko && !unfilteredList.includes(projektipaallikkonTunnus)) {
    unfilteredList.push(projektipaallikkonTunnus);
  }

  const list = unfilteredList.filter((yh) => yh);
  return list.length > 0 ? list : undefined;
}

function adaptVuorovaikutusTilaisuudetToSave(
  projekti: DBProjekti,
  vuorovaikutusTilaisuudet: Array<API.VuorovaikutusTilaisuusInput>
): VuorovaikutusTilaisuus[] | undefined {
  return vuorovaikutusTilaisuudet?.length > 0
    ? vuorovaikutusTilaisuudet.map((vv) => ({
        ...vv,
        esitettavatYhteystiedot: adaptYhteystiedotToSave(vv.esitettavatYhteystiedot),
        projektiYhteysHenkilot: adaptKayttajatunnusList(projekti, vv.projektiYhteysHenkilot, true),
      }))
    : undefined;
}

function adaptVuorovaikutusToSave(
  projekti: DBProjekti,
  projektiAdaptationResult: Partial<ProjektiAdaptationResult>,
  vuorovaikutusInput?: API.VuorovaikutusInput | null
): Vuorovaikutus[] {
  if (vuorovaikutusInput) {
    // Prevent saving vuorovaikutus if suunnitteluvaihe is not yet saved
    if (!projekti.suunnitteluVaihe) {
      throw new IllegalArgumentError("Vuorovaikutusta ei voi lisätä ennen kuin suunnitteluvaihe on tallennettu");
    }

    const dbVuorovaikutus = findVuorovaikutusByNumber(projekti, vuorovaikutusInput.vuorovaikutusNumero);

    const esittelyaineistot = adaptAineistotToSave(
      dbVuorovaikutus?.esittelyaineistot,
      vuorovaikutusInput.esittelyaineistot,
      projektiAdaptationResult
    );
    const suunnitelmaluonnokset = adaptAineistotToSave(
      dbVuorovaikutus?.suunnitelmaluonnokset,
      vuorovaikutusInput.suunnitelmaluonnokset,
      projektiAdaptationResult
    );

    const vuorovaikutusToSave: Vuorovaikutus = {
      ...vuorovaikutusInput,
      vuorovaikutusYhteysHenkilot: adaptKayttajatunnusList(projekti, vuorovaikutusInput.vuorovaikutusYhteysHenkilot),
      vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudetToSave(
        projekti,
        vuorovaikutusInput.vuorovaikutusTilaisuudet
      ),
      //Jos vuorovaikutuksen ilmoituksella ei tarvitse olla viranomaisvastaanottajia, muokkaa adaptIlmoituksenVastaanottajatToSavea
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToSave(vuorovaikutusInput.ilmoituksenVastaanottajat),
      esitettavatYhteystiedot: adaptYhteystiedotToSave(vuorovaikutusInput.esitettavatYhteystiedot),
      esittelyaineistot,
      suunnitelmaluonnokset,
    };

    checkIfAineistoJulkinenChanged(vuorovaikutusToSave, dbVuorovaikutus, projektiAdaptationResult);

    return [vuorovaikutusToSave];
  }
  return undefined;
}

function checkIfAineistoJulkinenChanged(
  vuorovaikutusToSave: Vuorovaikutus,
  dbVuorovaikutus: Vuorovaikutus,
  projektiAdaptationResult: Partial<ProjektiAdaptationResult>
) {
  function vuorovaikutusPublished() {
    return vuorovaikutusToSave.julkinen;
  }

  function vuorovaikutusNotPublicAnymore() {
    return dbVuorovaikutus && dbVuorovaikutus.julkinen && !vuorovaikutusToSave.julkinen;
  }

  function vuorovaikutusJulkaisuPaivaChanged() {
    return (
      dbVuorovaikutus?.vuorovaikutusJulkaisuPaiva &&
      dbVuorovaikutus.vuorovaikutusJulkaisuPaiva !== vuorovaikutusToSave.vuorovaikutusJulkaisuPaiva
    );
  }

  if (vuorovaikutusPublished() || vuorovaikutusNotPublicAnymore()) {
    projektiAdaptationResult.pushEvent({
      eventType: ProjektiEventType.VUOROVAIKUTUS_PUBLISHED,
      vuorovaikutusNumero: vuorovaikutusToSave.vuorovaikutusNumero,
    } as VuorovaikutusPublishedEvent);
  }

  if (vuorovaikutusPublished() || vuorovaikutusNotPublicAnymore() || vuorovaikutusJulkaisuPaivaChanged()) {
    projektiAdaptationResult.pushEvent({
      eventType: ProjektiEventType.AINEISTO_CHANGED,
    } as AineistoChangedEvent);
  }
}

function pickAineistoFromInputByDocumenttiOid(aineistotInput: API.AineistoInput[], dokumenttiOid: string) {
  const matchedElements = remove(aineistotInput, { dokumenttiOid });
  if (matchedElements.length > 0) {
    return matchedElements[0];
  }
  return undefined;
}

function adaptAineistotToSave(
  dbAineistot: Aineisto[] | undefined,
  aineistotInput: API.AineistoInput[] | undefined,
  projektiAdaptationResult: Partial<ProjektiAdaptationResult>
): Aineisto[] | undefined {
  const resultAineistot = [];
  let hasPendingChanges = undefined;

  // Examine and update existing documents
  if (dbAineistot) {
    dbAineistot.forEach((dbAineisto) => {
      const updateAineistoInput = pickAineistoFromInputByDocumenttiOid(aineistotInput, dbAineisto.dokumenttiOid);
      if (updateAineistoInput) {
        // Update existing one

        if (dbAineisto.nimi !== updateAineistoInput.nimi) {
          hasPendingChanges = true;
        }
        dbAineisto.nimi = updateAineistoInput.nimi;
        dbAineisto.jarjestys = updateAineistoInput.jarjestys;
        dbAineisto.kategoriaId = updateAineistoInput.kategoriaId;
        resultAineistot.push(dbAineisto);
      }
      if (!updateAineistoInput && aineistotInput) {
        dbAineisto.tila = API.AineistoTila.ODOTTAA_POISTOA;
        resultAineistot.push(dbAineisto);
        hasPendingChanges = true;
      }
    });
  }

  // Add new ones and optionally trigger import later
  if (aineistotInput) {
    for (const aineistoInput of aineistotInput) {
      resultAineistot.push({
        dokumenttiOid: aineistoInput.dokumenttiOid,
        nimi: aineistoInput.nimi,
        kategoriaId: aineistoInput.kategoriaId,
        jarjestys: aineistoInput.jarjestys,
        tila: API.AineistoTila.ODOTTAA_TUONTIA,
      });
      hasPendingChanges = true;
    }
  }

  if (hasPendingChanges) {
    projektiAdaptationResult.pushEvent({ eventType: ProjektiEventType.AINEISTO_CHANGED } as AineistoChangedEvent);
  }
  return resultAineistot;
}

function adaptSuunnitteluSopimusToSave(
  projekti: DBProjekti,
  suunnitteluSopimusInput?: API.SuunnitteluSopimusInput | null
): API.SuunnitteluSopimusInput | null | undefined {
  if (suunnitteluSopimusInput) {
    const { logo, ...rest } = suunnitteluSopimusInput;
    return { ...rest, logo: logo || projekti.suunnitteluSopimus?.logo };
  }
  return suunnitteluSopimusInput as undefined;
}

function adaptHankkeenKuvausToSave(hankkeenKuvaus: API.HankkeenKuvauksetInput): LocalizedMap<string> {
  if (!hankkeenKuvaus) {
    return undefined;
  }
  return { ...hankkeenKuvaus };
}

function adaptIlmoituksenVastaanottajatToSave(
  vastaanottajat: API.IlmoituksenVastaanottajatInput | null | undefined
): API.IlmoituksenVastaanottajat {
  if (!vastaanottajat) {
    return vastaanottajat as null | undefined;
  }
  const kunnat: API.KuntaVastaanottaja[] =
    vastaanottajat?.kunnat?.map((kunta) => ({ __typename: "KuntaVastaanottaja", ...kunta })) || null;
  if (!vastaanottajat?.viranomaiset || vastaanottajat.viranomaiset.length === 0) {
    throw new IllegalArgumentError("Viranomaisvastaanottajia pitää olla vähintään yksi.");
  }
  const viranomaiset: API.ViranomaisVastaanottaja[] =
    vastaanottajat?.viranomaiset?.map((viranomainen) => ({
      __typename: "ViranomaisVastaanottaja",
      ...viranomainen,
    })) || null;
  return { __typename: "IlmoituksenVastaanottajat", kunnat, viranomaiset };
}

function adaptAloitusKuulutusToSave(aloitusKuulutus: API.AloitusKuulutusInput): AloitusKuulutus | null | undefined {
  if (aloitusKuulutus) {
    const { hankkeenKuvaus, ilmoituksenVastaanottajat, ...rest } = aloitusKuulutus;
    return {
      ...rest,
      hankkeenKuvaus: adaptHankkeenKuvausToSave(hankkeenKuvaus),
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToSave(ilmoituksenVastaanottajat),
    };
  }
  return aloitusKuulutus as undefined;
}

function removeUndefinedFields(object: API.Projekti): Partial<API.Projekti> {
  return pickBy(object, (value) => value !== undefined);
}

export function findVuorovaikutusByNumber(
  projekti: DBProjekti,
  vuorovaikutusNumero: number
): Vuorovaikutus | undefined {
  return projekti.vuorovaikutukset?.filter((value) => value.vuorovaikutusNumero == vuorovaikutusNumero).pop();
}

export function findPublishedAloitusKuulutusJulkaisu(
  aloitusKuulutusJulkaisut: AloitusKuulutusJulkaisu[]
): AloitusKuulutusJulkaisu | undefined {
  return (
    findJulkaisuByStatus(aloitusKuulutusJulkaisut, API.AloitusKuulutusTila.HYVAKSYTTY) ||
    findJulkaisuByStatus(aloitusKuulutusJulkaisut, API.AloitusKuulutusTila.MIGROITU)
  );
}

export function findJulkaisuByStatus<T extends { tila?: API.AloitusKuulutusTila }>(
  aloitusKuulutusJulkaisut: T[],
  tila: API.AloitusKuulutusTila
): T | undefined {
  return aloitusKuulutusJulkaisut?.filter((j) => j.tila == tila).pop();
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
