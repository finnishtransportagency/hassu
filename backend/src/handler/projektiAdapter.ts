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
  VuorovaikutusInput,
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
  SuunnitteluVaihe,
  Vuorovaikutus,
  VuorovaikutusTilaisuus,
} from "../database/model/suunnitteluVaihe";

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
      ...fieldsToCopyAsIs
    } = dbProjekti;

    return removeUndefinedFields({
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
      suunnitteluVaihe: adaptSuunnitteluVaihe(suunnitteluVaihe, vuorovaikutukset),
      ...fieldsToCopyAsIs,
    }) as API.Projekti;
  }

  async adaptProjektiToPreview(projekti: DBProjekti, changes: API.TallennaProjektiInput): Promise<DBProjekti> {
    return mergeWith(projekti, (await this.adaptProjektiToSave(projekti, changes)).projekti);
  }

  async adaptProjektiToSave(
    projekti: DBProjekti,
    changes: API.TallennaProjektiInput
  ): Promise<{ projekti: DBProjekti; aineistotToDelete?: Aineisto[]; vuorovaikutusNumeroForAineistotImport?: number }> {
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
    const kayttoOikeudetManager = new KayttoOikeudetManager(projekti.kayttoOikeudet, await personSearch.getKayttajas());
    kayttoOikeudetManager.applyChanges(kayttoOikeudet);
    const { vuorovaikutukset, aineistotToDelete, vuorovaikutusNumeroForAineistotImport } = adaptVuorovaikutusToSave(
      projekti,
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
        suunnitteluVaihe: adaptSuunnitteluVaiheToSave(suunnitteluVaihe),
        kielitiedot,
        euRahoitus,
        liittyvatSuunnitelmat,
        vuorovaikutukset,
      }
    ) as DBProjekti;
    return { projekti: dbProjekti, aineistotToDelete, vuorovaikutusNumeroForAineistotImport };
  }

  /**
   * Function to determine the status of the projekti
   * @param projekti
   * @param param
   */
  applyStatus(projekti: API.Projekti, param: { saved?: boolean }) {
    function checkIfSaved() {
      if (param?.saved) {
        projekti.tallennettu = true;
        projekti.status = API.Status.EI_JULKAISTU;
      }
    }

    function checkPerustiedot() {
      try {
        perustiedotValidationSchema.validateSync(projekti);
        if (!projekti.aloitusKuulutus) {
          projekti.aloitusKuulutus = { __typename: "AloitusKuulutus" };
        }
        projekti.status = API.Status.ALOITUSKUULUTUS;
      } catch (e) {
        if (e instanceof ValidationError) {
          log.info("Perustiedot puutteelliset", e.errors);
        } else {
          throw e;
        }
      }
    }

    // Perustiedot is available if the projekti has been saved
    checkIfSaved();

    // Aloituskuulutus is available, if projekti has all basic information set
    checkPerustiedot();

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
  vuorovaikutukset: Array<Vuorovaikutus>
): API.SuunnitteluVaihe {
  if (suunnitteluVaihe) {
    return {
      ...suunnitteluVaihe,
      hankkeenKuvaus: suunnitteluVaihe.hankkeenKuvaus
        ? adaptHankkeenKuvaus(suunnitteluVaihe.hankkeenKuvaus)
        : undefined,
      vuorovaikutukset: adaptVuorovaikutukset(vuorovaikutukset),
      __typename: "SuunnitteluVaihe",
    };
  }
  return suunnitteluVaihe as undefined;
}

function adaptSuunnitteluVaiheToSave(suunnitteluVaihe: API.SuunnitteluVaiheInput): SuunnitteluVaihe {
  if (suunnitteluVaihe && (suunnitteluVaihe?.arvioSeuraavanVaiheenAlkamisesta || suunnitteluVaihe?.hankkeenKuvaus)) {
    return {
      arvioSeuraavanVaiheenAlkamisesta: suunnitteluVaihe.arvioSeuraavanVaiheenAlkamisesta,
      hankkeenKuvaus: suunnitteluVaihe.hankkeenKuvaus
        ? adaptHankkeenKuvaus(suunnitteluVaihe.hankkeenKuvaus)
        : undefined,
    };
  }
  return undefined;
}

function adaptVuorovaikutusToSave(
  projekti: DBProjekti,
  vuorovaikutus?: VuorovaikutusInput | null
): {
  vuorovaikutukset?: Vuorovaikutus[];
  aineistotToDelete?: Aineisto[];
  vuorovaikutusNumeroForAineistotImport?: number;
} {
  if (vuorovaikutus) {
    const { aineistot, aineistotToDelete, vuorovaikutusNumeroForAineistotImport } = adaptAineistotToSave(
      projekti,
      vuorovaikutus
    );
    return {
      vuorovaikutukset: [
        {
          ...vuorovaikutus,
          ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToSave(vuorovaikutus.ilmoituksenVastaanottajat),
          esitettavatYhteystiedot: vuorovaikutus.esitettavatYhteystiedot
            ? vuorovaikutus.esitettavatYhteystiedot.map((yt) => ({ __typename: "Yhteystieto", ...yt }))
            : undefined,
          aineistot,
        },
      ],
      aineistotToDelete,
      vuorovaikutusNumeroForAineistotImport,
    };
  }
  return { vuorovaikutukset: vuorovaikutus as undefined };
}

function pickAineistoFromInputByDocumenttiOid(aineistotInput: AineistoInput[], dokumenttiOid: string) {
  const matchedElements = remove(aineistotInput, { dokumenttiOid });
  if (matchedElements.length > 0) {
    return matchedElements[0];
  }
  return undefined;
}

function adaptAineistotToSave(
  projekti: DBProjekti,
  vuorovaikutusInput: VuorovaikutusInput
): { aineistot?: Aineisto[]; aineistotToDelete?: Aineisto[]; vuorovaikutusNumeroForAineistotImport?: number } {
  const vuorovaikutus = findVuorovaikutusByNumber(projekti, vuorovaikutusInput.vuorovaikutusNumero);
  if (!vuorovaikutus) {
    return {};
  }
  const aineistotInput = vuorovaikutusInput.aineistot ? [...vuorovaikutusInput.aineistot] : [];
  const aineistotToDelete = [];

  // Update existing ones
  const dbAineistot = vuorovaikutus.aineistot || [];
  dbAineistot.slice(0).forEach((dbAineisto, index, array) => {
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
  let vuorovaikutusNumeroForAineistotImport = undefined;
  for (const aineistoInput of aineistotInput) {
    dbAineistot.push({
      dokumenttiOid: aineistoInput.dokumenttiOid,
      jarjestys: aineistoInput.jarjestys,
      kategoria: aineistoInput.kategoria,
      tila: AineistoTila.ODOTTAA,
    });
    vuorovaikutusNumeroForAineistotImport = vuorovaikutus.vuorovaikutusNumero;
  }

  return { aineistot: dbAineistot, aineistotToDelete, vuorovaikutusNumeroForAineistotImport };
}

function adaptAineistot(aineistot?: Aineisto[] | null): API.Aineisto[] | undefined {
  if (aineistot && aineistot.length > 0) {
    return aineistot.map((aineisto) => ({ __typename: "Aineisto", ...aineisto }));
  }
  return undefined;
}

function adaptVuorovaikutukset(vuorovaikutukset: Array<Vuorovaikutus>): API.Vuorovaikutus[] {
  if (vuorovaikutukset && vuorovaikutukset.length > 0) {
    return vuorovaikutukset.map((vuorovaikutus) => ({
      ...vuorovaikutus,
      vuorovaikutusTilaisuudet: adaptVuorovaikutusTilaisuudet(vuorovaikutus.vuorovaikutusTilaisuudet),
      videot: adaptLinkkiList(vuorovaikutus.videot),
      aineistot: adaptAineistot(vuorovaikutus.aineistot),
      __typename: "Vuorovaikutus",
    }));
  }
  return vuorovaikutukset as undefined;
}

function adaptVuorovaikutusTilaisuudet(
  vuorovaikutusTilaisuudet: Array<VuorovaikutusTilaisuus>
): API.VuorovaikutusTilaisuus[] {
  if (vuorovaikutusTilaisuudet) {
    return vuorovaikutusTilaisuudet.map((vuorovaikutusTilaisuus) => ({
      ...vuorovaikutusTilaisuus,
      __typename: "VuorovaikutusTilaisuus",
    }));
  }
  return vuorovaikutusTilaisuudet as undefined;
}

function adaptLinkkiList(links: Array<Linkki>): API.Linkki[] {
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

export function adaptYhteystiedot(yhteystiedot: Yhteystieto[]): API.Yhteystieto[] {
  if (yhteystiedot) {
    return yhteystiedot.map((yt) => ({ __typename: "Yhteystieto", ...yt }));
  }
  return [];
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
