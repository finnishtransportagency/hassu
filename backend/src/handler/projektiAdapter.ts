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
  AloitusKuulutusInput,
  AloitusKuulutusPDFt,
  HankkeenKuvaukset,
  HankkeenKuvauksetInput,
  IlmoituksenVastaanottajat,
  IlmoituksenVastaanottajatInput,
  Kieli,
  Projekti,
  Status,
} from "../../../common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { KayttoOikeudetManager } from "./kayttoOikeudetManager";
import { personSearch } from "../personSearch/personSearchClient";
import pickBy from "lodash/pickBy";
import { fileService } from "../files/fileService";
import { perustiedotValidationSchema } from "../../../src/schemas/perustiedot";
import { ValidationError } from "yup";
import { log } from "../logger";

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
      ...fieldsToCopyAsIs,
    }) as API.Projekti;
  }

  async adaptProjektiToPreview(projekti: DBProjekti, changes: API.TallennaProjektiInput): Promise<DBProjekti> {
    return mergeWith(projekti, await this.adaptProjektiToSave(projekti, changes));
  }

  async adaptProjektiToSave(projekti: DBProjekti, changes: API.TallennaProjektiInput): Promise<DBProjekti> {
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
    } = changes;
    const kayttoOikeudetManager = new KayttoOikeudetManager(projekti.kayttoOikeudet, await personSearch.getKayttajas());
    kayttoOikeudetManager.applyChanges(kayttoOikeudet);
    return mergeWith(
      {},
      {
        oid,
        muistiinpano,
        aloitusKuulutus: adaptAloitusKuulutusToSave(aloitusKuulutus),
        suunnitteluSopimus: adaptSuunnitteluSopimusToSave(projekti, suunnitteluSopimus),
        kayttoOikeudet: kayttoOikeudetManager.getKayttoOikeudet(),
        kielitiedot,
        euRahoitus,
        liittyvatSuunnitelmat,
      }
    ) as DBProjekti;
  }

  /**
   * Function to determine the status of the projekti
   * @param projekti
   * @param param
   */
  applyStatus(projekti: Projekti, param: { saved?: boolean }) {
    function checkIfSaved() {
      if (param?.saved) {
        projekti.tallennettu = true;
        projekti.status = Status.EI_JULKAISTU;
      }
    }

    function checkPerustiedot() {
      try {
        perustiedotValidationSchema.validateSync(projekti);
        if (!projekti.aloitusKuulutus) {
          projekti.aloitusKuulutus = { __typename: "AloitusKuulutus" };
        }
        projekti.status = Status.ALOITUSKUULUTUS;
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

function adaptHankkeenKuvausToSave(hankkeenKuvaus: HankkeenKuvauksetInput): LocalizedMap<string> {
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

export const projektiAdapter = new ProjektiAdapter();
