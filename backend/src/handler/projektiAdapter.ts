import {
  AloitusKuulutus,
  AloitusKuulutusJulkaisu,
  AloitusKuulutusPDF,
  DBProjekti,
  Kielitiedot,
  LocalizedMap,
  Suunnitelma,
  SuunnitteluSopimus,
  Velho,
  Yhteystieto,
} from "../database/model/projekti";
import * as API from "../../../common/graphql/apiModel";
import {
  AineistoInput,
  AineistoTila,
  AloitusKuulutusInput,
  AloitusKuulutusPDFt,
  HankkeenKuvaukset,
  IlmoituksenVastaanottajat,
  IlmoituksenVastaanottajatInput,
  Kieli,
  Projekti,
  ProjektiRooli,
  Status,
  VuorovaikutusInput,
  VuorovaikutusTilaisuusInput,
  YhteystietoInput,
} from "../../../common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";
import { personSearch } from "../personSearch/personSearchClient";
import pickBy from "lodash/pickBy";
import remove from "lodash/remove";
import { fileService } from "../files/fileService";
import { perustiedotValidationSchema } from "../../../src/schemas/perustiedot";
import { ValidationError } from "yup";
import { log } from "../logger";
import {
  Aineisto,
  Linkki,
  Palaute,
  SuunnitteluVaihe,
  Vuorovaikutus,
  VuorovaikutusTilaisuus,
} from "../database/model/suunnitteluVaihe";
import dayjs, { Dayjs } from "dayjs";
import { kayttoOikeudetSchema } from "../../../src/schemas/kayttoOikeudet";

export type ProjektiAdaptationResult = {
  projekti: DBProjekti;
  aineistoChanges?: {
    vuorovaikutus?: Vuorovaikutus;
    aineistotToDelete?: Aineisto[];
    hasPendingImports?: boolean;
    julkinenChanged?: boolean;
  };
};

export class ProjektiAdapter {
  public adaptProjekti(dbProjekti: DBProjekti): API.Projekti {
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
    } = changes;
    const projektiAdaptationResult: Partial<ProjektiAdaptationResult> = {};
    const kayttoOikeudetManager = new KayttoOikeudetManager(projekti.kayttoOikeudet, await personSearch.getKayttajas());
    kayttoOikeudetManager.applyChanges(kayttoOikeudet);
    const vuorovaikutukset = adaptVuorovaikutusToSave(
      projekti,
      projektiAdaptationResult,
      suunnitteluVaihe?.vuorovaikutus
    );
    const dbProjekti = mergeWith(
      {},
      {
        oid,
        muistiinpano,
        aloitusKuulutus: adaptAloitusKuulutusToSave(aloitusKuulutus),
        suunnitteluSopimus: adaptSuunnitteluSopimusToSave(projekti, suunnitteluSopimus),
        kayttoOikeudet: kayttoOikeudetManager.getKayttoOikeudet(),
        suunnitteluVaihe: adaptSuunnitteluVaiheToSave(projekti.suunnitteluVaihe, suunnitteluVaihe),
        kielitiedot,
        euRahoitus,
        liittyvatSuunnitelmat,
        vuorovaikutukset,
      }
    ) as DBProjekti;
    return { projekti: dbProjekti, ...projektiAdaptationResult };
  }

  /**
   * Function to determine the status of the projekti
   * @param projekti
   */
  private applyStatus(projekti: Projekti): Projekti {
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
        projekti.status = Status.SUUNNITTELU;
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
  dbSuunnitteluVaihe: SuunnitteluVaihe,
  suunnitteluVaihe: API.SuunnitteluVaiheInput
): SuunnitteluVaihe {
  if (
    suunnitteluVaihe &&
    (suunnitteluVaihe.arvioSeuraavanVaiheenAlkamisesta ||
      suunnitteluVaihe.hankkeenKuvaus ||
      suunnitteluVaihe.suunnittelunEteneminenJaKesto)
  ) {
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

function adaptYhteystiedotToSave(yhteystietoInputs: Array<YhteystietoInput>) {
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
    ({ rooli }) => rooli === ProjektiRooli.PROJEKTIPAALLIKKO
  )?.kayttajatunnus;
  if (!doNotForceProjektipaallikko && !unfilteredList.includes(projektipaallikkonTunnus)) {
    unfilteredList.push(projektipaallikkonTunnus);
  }

  const list = unfilteredList.filter((yh) => yh);
  return list.length > 0 ? list : undefined;
}

function adaptVuorovaikutusTilaisuudetToSave(
  projekti: DBProjekti,
  vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuusInput>
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
  vuorovaikutusInput?: VuorovaikutusInput | null
): Vuorovaikutus[] {
  if (vuorovaikutusInput) {
    const dbVuorovaikutus = findVuorovaikutusByNumber(projekti, vuorovaikutusInput.vuorovaikutusNumero);

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
      aineistot: adaptAineistotToSave(projektiAdaptationResult, vuorovaikutusInput, dbVuorovaikutus),
    };

    checkIfAineistoJulkinenChanged(vuorovaikutusToSave, dbVuorovaikutus, projektiAdaptationResult);
    if (projektiAdaptationResult.aineistoChanges) {
      projektiAdaptationResult.aineistoChanges.vuorovaikutus = vuorovaikutusToSave;
    }

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

  if (vuorovaikutusPublishedForTheFirstTime() || vuorovaikutusNotPublicAnymore()) {
    if (projektiAdaptationResult.aineistoChanges) {
      projektiAdaptationResult.aineistoChanges.julkinenChanged = true;
    } else {
      projektiAdaptationResult.aineistoChanges = { julkinenChanged: true };
    }
  }
}

function pickAineistoFromInputByDocumenttiOid(aineistotInput: AineistoInput[], dokumenttiOid: string) {
  const matchedElements = remove(aineistotInput, { dokumenttiOid });
  if (matchedElements.length > 0) {
    return matchedElements[0];
  }
  return undefined;
}

function adaptAineistotToSave(
  projektiAdaptationResult: Partial<ProjektiAdaptationResult>,
  vuorovaikutusInput: VuorovaikutusInput,
  vuorovaikutus?: Vuorovaikutus
): Aineisto[] | undefined {
  if (!vuorovaikutus) {
    return undefined;
  }
  const aineistotInput = vuorovaikutusInput.aineistot ? [...vuorovaikutusInput.aineistot] : [];
  const aineistotToDelete = [];

  // Update existing ones
  const dbAineistot = vuorovaikutus.aineistot || [];
  dbAineistot.slice(0).forEach((dbAineisto) => {
    const aineistoInput = pickAineistoFromInputByDocumenttiOid(aineistotInput, dbAineisto.dokumenttiOid);
    if (aineistoInput) {
      // Update existing one
      dbAineisto.kategoria = aineistoInput.kategoria;
      dbAineisto.jarjestys = aineistoInput.jarjestys;
    } else {
      aineistotToDelete.push(dbAineisto);
    }
  });

  // Remove deleted ones
  aineistotToDelete.forEach((aineistoToDelete) =>
    remove(dbAineistot, { dokumenttiOid: aineistoToDelete.dokumenttiOid })
  );

  // Add new ones and optionally trigger import later
  let hasPendingImports = undefined;
  for (const aineistoInput of aineistotInput) {
    dbAineistot.push({
      dokumenttiOid: aineistoInput.dokumenttiOid,
      jarjestys: aineistoInput.jarjestys,
      kategoria: aineistoInput.kategoria,
      tila: AineistoTila.ODOTTAA,
    });
    hasPendingImports = true;
  }
  projektiAdaptationResult.aineistoChanges = { vuorovaikutus: null, aineistotToDelete, hasPendingImports };
  return dbAineistot;
}

export function adaptAineistot(aineistot?: Aineisto[] | null, julkaisuPaiva?: Dayjs): Aineisto[] | undefined {
  if (julkaisuPaiva && julkaisuPaiva.isAfter(dayjs())) {
    return undefined;
  }
  if (aineistot && aineistot.length > 0) {
    return aineistot.map((aineisto) => ({ __typename: "Aineisto", ...aineisto }));
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
          aineistot: adaptAineistot(vuorovaikutus.aineistot),
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
  vastaanottajat: IlmoituksenVastaanottajatInput | null | undefined
): IlmoituksenVastaanottajat {
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

function adaptAloitusKuulutusToSave(aloitusKuulutus: AloitusKuulutusInput): AloitusKuulutus | null | undefined {
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
): AloitusKuulutusPDFt | undefined {
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
  return { __typename: "AloitusKuulutusPDFt", SUOMI: result[Kieli.SUOMI], ...result };
}

export function adaptHankkeenKuvaus(hankkeenKuvaus: LocalizedMap<string>): HankkeenKuvaukset {
  return {
    __typename: "HankkeenKuvaukset",
    SUOMI: hankkeenKuvaus.SUOMI,
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

export function adaptVelho(velho: Velho): API.Velho {
  return { __typename: "Velho", ...velho };
}

export function findVuorovaikutusByNumber(
  projekti: DBProjekti,
  vuorovaikutusNumero: number
): Vuorovaikutus | undefined {
  return projekti.vuorovaikutukset?.filter((value) => value.vuorovaikutusNumero == vuorovaikutusNumero).pop();
}

export const projektiAdapter = new ProjektiAdapter();
