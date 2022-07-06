import {
  Aineisto,
  AloitusKuulutus,
  AloitusKuulutusJulkaisu,
  AloitusKuulutusPDF,
  DBProjekti,
  Kielitiedot,
  Linkki,
  LocalizedMap,
  NahtavillaoloPDF,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  Palaute,
  Suunnitelma,
  SuunnitteluSopimus,
  SuunnitteluVaihe,
  Velho,
  Vuorovaikutus,
  VuorovaikutusTilaisuus,
  Yhteystieto,
} from "../database/model";
import * as API from "../../../common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";
import { personSearch } from "../personSearch/personSearchClient";
import pickBy from "lodash/pickBy";
import remove from "lodash/remove";
import { fileService } from "../files/fileService";
import { perustiedotValidationSchema } from "../../../src/schemas/perustiedot";
import { ValidationError } from "yup";
import { log } from "../logger";
import dayjs, { Dayjs } from "dayjs";
import { kayttoOikeudetSchema } from "../../../src/schemas/kayttoOikeudet";
import { IllegalArgumentError } from "../error/IllegalArgumentError";

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
      ...fieldsToCopyAsIs
    } = dbProjekti;

    const apiProjekti = removeUndefinedFields({
      __typename: "Projekti",
      tallennettu: !!dbProjekti.tallennettu,
      kayttoOikeudet: KayttoOikeudetManager.adaptAPIKayttoOikeudet(kayttoOikeudet),
      tyyppi: velho?.tyyppi || dbProjekti.tyyppi, // remove usage of projekti.tyyppi after all data has been migrated to new format
      aloitusKuulutus: adaptAloitusKuulutus(aloitusKuulutus),
      suunnitteluSopimus: adaptSuunnitteluSopimus(dbProjekti.oid, suunnitteluSopimus),
      liittyvatSuunnitelmat: adaptLiittyvatSuunnitelmat(liittyvatSuunnitelmat),
      aloitusKuulutusJulkaisut: adaptAloitusKuulutusJulkaisut(dbProjekti.oid, aloitusKuulutusJulkaisut),
      velho: {
        __typename: "Velho",
        ...velho,
      },
      kielitiedot: adaptKielitiedot(kielitiedot),
      suunnitteluVaihe: adaptSuunnitteluVaihe(suunnitteluVaihe, vuorovaikutukset, palautteet),
      nahtavillaoloVaihe: adaptNahtavillaoloVaihe(dbProjekti.oid, nahtavillaoloVaihe),
      nahtavillaoloVaiheJulkaisut: adaptNahtavillaoloVaiheJulkaisut(dbProjekti.oid, nahtavillaoloVaiheJulkaisut),
      virhetiedot,
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
        kielitiedot,
        euRahoitus,
        liittyvatSuunnitelmat,
        vuorovaikutukset,
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
      if (projekti?.aloitusKuulutusJulkaisut) {
        projekti.status = API.Status.SUUNNITTELU;
      }
    }

    function checkNahtavillaolo() {
      if (projekti?.suunnitteluVaihe?.julkinen) {
        projekti.status = API.Status.NAHTAVILLAOLO;
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

    return projekti;
  }
}

function adaptLiittyvatSuunnitelmat(suunnitelmat?: Suunnitelma[] | null): API.Suunnitelma[] | undefined | null {
  if (suunnitelmat) {
    const liittyvatSuunnitelmat = suunnitelmat.map(
      (suunnitelma) =>
        ({
          __typename: "Suunnitelma",
          ...suunnitelma,
        } as Suunnitelma)
    );
    return liittyvatSuunnitelmat as API.Suunnitelma[];
  }
  return suunnitelmat as undefined | null;
}

export function adaptKielitiedot(kielitiedot?: Kielitiedot | null): API.Kielitiedot | undefined | null {
  if (kielitiedot) {
    return {
      ...kielitiedot,
      __typename: "Kielitiedot",
    };
  }
  return kielitiedot as undefined;
}

function adaptSuunnitteluVaihe(
  suunnitteluVaihe: SuunnitteluVaihe,
  vuorovaikutukset: Array<Vuorovaikutus>,
  palautteet: Array<Palaute>
): API.SuunnitteluVaihe {
  if (suunnitteluVaihe) {
    const { julkinen, arvioSeuraavanVaiheenAlkamisesta, suunnittelunEteneminenJaKesto, palautteidenVastaanottajat } =
      suunnitteluVaihe;
    return {
      julkinen,
      arvioSeuraavanVaiheenAlkamisesta,
      suunnittelunEteneminenJaKesto,
      hankkeenKuvaus: suunnitteluVaihe.hankkeenKuvaus
        ? adaptHankkeenKuvaus(suunnitteluVaihe.hankkeenKuvaus)
        : undefined,
      vuorovaikutukset: adaptVuorovaikutukset(vuorovaikutukset),
      palautteet: palautteet ? palautteet.map((palaute) => ({ __typename: "Palaute", ...palaute })) : undefined,
      palautteidenVastaanottajat,
      __typename: "SuunnitteluVaihe",
    };
  }
  return suunnitteluVaihe as undefined;
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

function adaptNahtavillaoloVaihe(oid: string, nahtavillaoloVaihe: NahtavillaoloVaihe): API.NahtavillaoloVaihe {
  if (!nahtavillaoloVaihe) {
    return undefined;
  }
  const {
    aineistoNahtavilla,
    lisaAineisto,
    kuulutusYhteystiedot,
    ilmoituksenVastaanottajat,
    hankkeenKuvaus,
    nahtavillaoloPDFt,
    ...rest
  } = nahtavillaoloVaihe;
  return {
    __typename: "NahtavillaoloVaihe",
    ...rest,
    nahtavillaoloPDFt: adaptNahtavillaoloPDFPaths(oid, nahtavillaoloPDFt),
    aineistoNahtavilla: adaptAineistot(aineistoNahtavilla),
    lisaAineisto: adaptAineistot(lisaAineisto),
    kuulutusYhteystiedot: adaptYhteystiedot(kuulutusYhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
    hankkeenKuvaus: adaptHankkeenKuvaus(hankkeenKuvaus),
  };
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
  function vuorovaikutusPublishedForTheFirstTime() {
    return !dbVuorovaikutus?.julkinen && vuorovaikutusToSave.julkinen;
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

  if (vuorovaikutusPublishedForTheFirstTime() || vuorovaikutusNotPublicAnymore()) {
    projektiAdaptationResult.pushEvent({
      eventType: ProjektiEventType.VUOROVAIKUTUS_PUBLISHED,
      vuorovaikutusNumero: vuorovaikutusToSave.vuorovaikutusNumero,
    } as VuorovaikutusPublishedEvent);
  }

  if (
    vuorovaikutusPublishedForTheFirstTime() ||
    vuorovaikutusNotPublicAnymore() ||
    vuorovaikutusJulkaisuPaivaChanged()
  ) {
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
      if (!updateAineistoInput) {
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

export function adaptAineistot(aineistot?: Aineisto[] | null, julkaisuPaiva?: Dayjs): API.Aineisto[] | undefined {
  if (julkaisuPaiva && julkaisuPaiva.isAfter(dayjs())) {
    return undefined;
  }
  if (aineistot && aineistot.length > 0) {
    return aineistot
      .filter((aineisto) => aineisto.tila != API.AineistoTila.ODOTTAA_POISTOA)
      .map((aineisto) => ({
        __typename: "Aineisto",
        dokumenttiOid: aineisto.dokumenttiOid,
        ...aineisto,
      }));
  }
  return undefined;
}

function adaptVuorovaikutukset(vuorovaikutukset: Array<Vuorovaikutus>): API.Vuorovaikutus[] {
  if (vuorovaikutukset && vuorovaikutukset.length > 0) {
    return vuorovaikutukset.map(
      (vuorovaikutus) =>
        ({
          ...vuorovaikutus,
          vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudet(vuorovaikutus.vuorovaikutusTilaisuudet),
          suunnittelumateriaali: adaptLinkki(vuorovaikutus.suunnittelumateriaali),
          videot: adaptLinkkiList(vuorovaikutus.videot),
          esittelyaineistot: adaptAineistot(vuorovaikutus.esittelyaineistot),
          suunnitelmaluonnokset: adaptAineistot(vuorovaikutus.suunnitelmaluonnokset),
          __typename: "Vuorovaikutus",
        } as API.Vuorovaikutus)
    );
  }
  return vuorovaikutukset as undefined;
}

function adaptVuorovaikutusTilaisuudet(
  vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuus>
): API.VuorovaikutusTilaisuus[] {
  if (vuorovaikutusTilaisuudet) {
    return vuorovaikutusTilaisuudet.map((vuorovaikutusTilaisuus) => ({
      ...vuorovaikutusTilaisuus,
      esitettavatYhteystiedot: adaptYhteystiedot(vuorovaikutusTilaisuus.esitettavatYhteystiedot),
      __typename: "VuorovaikutusTilaisuus",
    }));
  }
  return vuorovaikutusTilaisuudet as undefined;
}

export function adaptLinkki(link: Linkki): API.Linkki {
  if (link) {
    return {
      ...link,
      __typename: "Linkki",
    };
  }
  return link as undefined;
}

export function adaptLinkkiList(links: Array<Linkki>): API.Linkki[] {
  if (links) {
    return links.map((link) => ({
      ...link,
      __typename: "Linkki",
    }));
  }
  return links as undefined;
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
    throw new Error("Viranomaisvastaanottajia pitää olla vähintään yksi.");
  }
  const viranomaiset: API.ViranomaisVastaanottaja[] =
    vastaanottajat?.viranomaiset?.map((viranomainen) => ({
      __typename: "ViranomaisVastaanottaja",
      ...viranomainen,
    })) || null;
  return { __typename: "IlmoituksenVastaanottajat", kunnat, viranomaiset };
}

function adaptIlmoituksenVastaanottajat(
  vastaanottajat: API.IlmoituksenVastaanottajat | null | undefined
): API.IlmoituksenVastaanottajat {
  if (!vastaanottajat) {
    return vastaanottajat as null | undefined;
  }
  const kunnat: API.KuntaVastaanottaja[] =
    vastaanottajat?.kunnat?.map((kunta) => ({ __typename: "KuntaVastaanottaja", ...kunta })) || null;
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

function adaptAloitusKuulutus(kuulutus?: AloitusKuulutus | null): API.AloitusKuulutus | undefined {
  if (kuulutus) {
    const { esitettavatYhteystiedot, ...otherKuulutusFields } = kuulutus;
    const yhteystiedot: API.Yhteystieto[] | undefined = esitettavatYhteystiedot?.map(
      (yhteystieto) =>
        ({
          __typename: "Yhteystieto",
          ...yhteystieto,
        } as API.Yhteystieto)
    );
    return {
      __typename: "AloitusKuulutus",
      ...otherKuulutusFields,
      esitettavatYhteystiedot: yhteystiedot,
      hankkeenKuvaus: adaptHankkeenKuvaus(kuulutus.hankkeenKuvaus),
    };
  }
  return kuulutus as undefined;
}

function adaptSuunnitteluSopimus(
  oid: string,
  suunnitteluSopimus?: SuunnitteluSopimus | null
): API.SuunnitteluSopimus | undefined | null {
  if (suunnitteluSopimus) {
    return {
      __typename: "SuunnitteluSopimus",
      ...suunnitteluSopimus,
      logo: fileService.getYllapitoPathForProjektiFile(oid, suunnitteluSopimus.logo),
    };
  }
  return suunnitteluSopimus as undefined | null;
}

function removeUndefinedFields(object: API.Projekti): Partial<API.Projekti> {
  return pickBy(object, (value) => value !== undefined);
}

export function adaptYhteystiedot(yhteystiedot: Yhteystieto[]): API.Yhteystieto[] | undefined | null {
  if (yhteystiedot) {
    return yhteystiedot.map((yt) => ({ __typename: "Yhteystieto", ...yt }));
  }
  return yhteystiedot as undefined | null;
}

export function adaptJulkaisuPDFPaths(
  oid: string,
  aloitusKuulutusPDFS: LocalizedMap<AloitusKuulutusPDF>
): API.AloitusKuulutusPDFt | undefined {
  if (!aloitusKuulutusPDFS) {
    return undefined;
  }

  const result = {};
  for (const kieli in aloitusKuulutusPDFS) {
    result[kieli] = {
      aloituskuulutusPDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        aloitusKuulutusPDFS[kieli].aloituskuulutusPDFPath
      ),
      aloituskuulutusIlmoitusPDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        aloitusKuulutusPDFS[kieli].aloituskuulutusIlmoitusPDFPath
      ),
    } as AloitusKuulutusPDF;
  }
  return { __typename: "AloitusKuulutusPDFt", SUOMI: result[API.Kieli.SUOMI], ...result };
}

export function adaptNahtavillaoloPDFPaths(
  oid: string,
  nahtavillaoloPDFs: LocalizedMap<NahtavillaoloPDF>
): API.NahtavillaoloPDFt | undefined {
  if (!nahtavillaoloPDFs) {
    return undefined;
  }

  const result = {};
  for (const kieli in nahtavillaoloPDFs) {
    result[kieli] = {
      nahtavillaoloPDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        nahtavillaoloPDFs[kieli].nahtavillaoloPDFPath
      ),
      nahtavillaoloIlmoitusPDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        nahtavillaoloPDFs[kieli].nahtavillaoloIlmoitusPDFPath
      ),
      nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath: fileService.getYllapitoPathForProjektiFile(
        oid,
        nahtavillaoloPDFs[kieli].nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath
      ),
    } as NahtavillaoloPDF;
  }
  return { __typename: "NahtavillaoloPDFt", SUOMI: result[API.Kieli.SUOMI], ...result };
}

export function adaptHankkeenKuvaus(hankkeenKuvaus: LocalizedMap<string>): API.HankkeenKuvaukset {
  return {
    __typename: "HankkeenKuvaukset",
    SUOMI: hankkeenKuvaus?.SUOMI,
    ...hankkeenKuvaus,
  };
}

export function adaptAloitusKuulutusJulkaisut(
  oid: string,
  aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null
): API.AloitusKuulutusJulkaisu[] | undefined {
  if (aloitusKuulutusJulkaisut) {
    return aloitusKuulutusJulkaisut.map((julkaisu) => {
      const { yhteystiedot, velho, suunnitteluSopimus, kielitiedot, ...fieldsToCopyAsIs } = julkaisu;

      return {
        ...fieldsToCopyAsIs,
        __typename: "AloitusKuulutusJulkaisu",
        hankkeenKuvaus: adaptHankkeenKuvaus(julkaisu.hankkeenKuvaus),
        yhteystiedot: adaptYhteystiedot(yhteystiedot),
        velho: adaptVelho(velho),
        suunnitteluSopimus: adaptSuunnitteluSopimus(oid, suunnitteluSopimus),
        kielitiedot: adaptKielitiedot(kielitiedot),
        aloituskuulutusPDFt: adaptJulkaisuPDFPaths(oid, julkaisu.aloituskuulutusPDFt),
      };
    });
  }
  return undefined;
}

export function adaptNahtavillaoloVaiheJulkaisut(
  oid: string,
  julkaisut?: NahtavillaoloVaiheJulkaisu[] | null
): API.NahtavillaoloVaiheJulkaisu[] | undefined {
  if (julkaisut) {
    return julkaisut.map((julkaisu) => {
      const {
        aineistoNahtavilla,
        lisaAineisto,
        hankkeenKuvaus,
        ilmoituksenVastaanottajat,
        kuulutusYhteystiedot,
        nahtavillaoloPDFt,
        kielitiedot,
        velho,
        ...fieldsToCopyAsIs
      } = julkaisu;

      return {
        ...fieldsToCopyAsIs,
        __typename: "NahtavillaoloVaiheJulkaisu",
        hankkeenKuvaus: adaptHankkeenKuvaus(hankkeenKuvaus),
        kielitiedot: adaptKielitiedot(kielitiedot),
        kuulutusYhteystiedot: adaptYhteystiedot(kuulutusYhteystiedot),
        ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajat(ilmoituksenVastaanottajat),
        aineistoNahtavilla: adaptAineistot(aineistoNahtavilla),
        lisaAineisto: adaptAineistot(lisaAineisto),
        nahtavillaoloPDFt: adaptNahtavillaoloPDFPaths(oid, nahtavillaoloPDFt),
        velho: adaptVelho(velho),
      };
    });
  }
  return undefined;
}

export function adaptVelho(velho: Velho): API.Velho {
  return { __typename: "Velho", ...velho };
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

export const projektiAdapter = new ProjektiAdapter();
