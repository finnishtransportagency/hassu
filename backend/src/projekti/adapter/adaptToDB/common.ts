import * as API from "../../../../../common/graphql/apiModel";
import { IllegalArgumentError } from "../../../error/IllegalArgumentError";
import {
  Aineisto,
  IlmoituksenVastaanottajat,
  KuntaVastaanottaja,
  LocalizedMap,
  StandardiYhteystiedot,
  ViranomaisVastaanottaja,
  Yhteystieto,
} from "../../../database/model";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import remove from "lodash/remove";

export function adaptIlmoituksenVastaanottajatToSave(
  vastaanottajat: API.IlmoituksenVastaanottajatInput | null | undefined
): IlmoituksenVastaanottajat | null | undefined {
  if (vastaanottajat === null) {
    return null;
  }
  if (vastaanottajat === undefined) {
    return undefined;
  }
  if (!vastaanottajat.kunnat) {
    throw new IllegalArgumentError("Ilmoituksen vastaanottajissa tulee olla kunnat mukana!");
  }
  const kunnat: API.KuntaVastaanottajaInput[] = vastaanottajat.kunnat;
  if (!vastaanottajat?.viranomaiset || vastaanottajat.viranomaiset.length === 0) {
    throw new IllegalArgumentError("Viranomaisvastaanottajia pitää olla vähintään yksi.");
  }
  const viranomaiset: ViranomaisVastaanottaja[] = vastaanottajat?.viranomaiset;
  return {
    kunnat: (kunnat as API.KuntaVastaanottajaInput[]).map(
      (kunta) => removeTypeName(kunta as General<KuntaVastaanottaja>) as KuntaVastaanottaja
    ),
    viranomaiset: viranomaiset.map(
      (viranomainen) => removeTypeName(viranomainen as General<ViranomaisVastaanottaja>) as ViranomaisVastaanottaja
    ),
  };
}

export function adaptYhteystiedotToSave(yhteystietoInputs: Array<API.YhteystietoInput> | undefined | null): Yhteystieto[] | undefined {
  if (!yhteystietoInputs) {
    return undefined;
  }
  return yhteystietoInputs?.length > 0
    ? yhteystietoInputs.map((yt: API.YhteystietoInput) => {
        const ytToSave: Yhteystieto = {
          etunimi: yt.etunimi,
          sukunimi: yt.sukunimi,
          organisaatio: yt.organisaatio || undefined,
          kunta: yt.kunta || undefined,
          puhelinnumero: yt.puhelinnumero,
          sahkoposti: yt.sahkoposti,
        };
        return ytToSave;
      })
    : undefined;
}

export function adaptYhteysHenkilotToSave(yhteystiedot: string[] | undefined | null): string[] | undefined {
  return yhteystiedot?.filter((yt, index) => yhteystiedot.indexOf(yt) === index);
}

export function adaptStandardiYhteystiedotToSave(
  kuulutusYhteystiedot: API.StandardiYhteystiedotInput | null | undefined,
  tyhjaEiOk?: boolean
): StandardiYhteystiedot | undefined {
  if ((kuulutusYhteystiedot?.yhteysTiedot || []).length + (kuulutusYhteystiedot?.yhteysHenkilot || []).length === 0) {
    if (!tyhjaEiOk) {
      return undefined;
    } else {
      throw new IllegalArgumentError("Standardiyhteystietojen on sisällettävä vähintään yksi yhteystieto!");
    }
  }
  return {
    yhteysTiedot: adaptYhteystiedotToSave(kuulutusYhteystiedot?.yhteysTiedot),
    yhteysHenkilot: adaptYhteysHenkilotToSave(kuulutusYhteystiedot?.yhteysHenkilot),
  };
}

export function adaptAineistotToSave(
  dbAineistot: Aineisto[] | undefined | null,
  aineistotInput: API.AineistoInput[] | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): Aineisto[] | undefined {
  const resultAineistot = [];
  let hasPendingChanges = undefined;

  if (!aineistotInput) {
    return;
  }

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
        dbAineisto.kategoriaId = updateAineistoInput.kategoriaId || undefined;
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
        kategoriaId: aineistoInput.kategoriaId || undefined,
        jarjestys: aineistoInput.jarjestys,
        tila: API.AineistoTila.ODOTTAA_TUONTIA,
      });
      hasPendingChanges = true;
    }
  }

  if (hasPendingChanges) {
    projektiAdaptationResult.aineistoChanged();
  }
  return resultAineistot;
}

function pickAineistoFromInputByDocumenttiOid(aineistotInput: API.AineistoInput[], dokumenttiOid: string) {
  const matchedElements = remove(aineistotInput, (item) => item.dokumenttiOid === dokumenttiOid);
  if (matchedElements.length > 0) {
    return matchedElements[0];
  }
  return undefined;
}

type General<T> = { __typename: string } & T;

export function removeTypeName<Type>(o: General<Type> | null | undefined): Type | null | undefined {
  if (!o) {
    return o;
  }
  const result: Partial<General<Type>> = { ...o };
  delete result.__typename;
  return result as Type;
}

export function adaptHankkeenKuvausToSave(
  hankkeenKuvaus: API.LokalisoituTekstiInput | undefined | null
): LocalizedMap<string> | undefined | null {
  if (!hankkeenKuvaus) {
    return hankkeenKuvaus;
  }
  const kuvausSuomi = hankkeenKuvaus[API.Kieli.SUOMI];
  if (!kuvausSuomi) {
    throw new Error(`adaptHankkeenKuvaus: hankkeenKuvaus.${API.Kieli.SUOMI} puuttuu`);
  }
  const kuvaus: LocalizedMap<string> = { [API.Kieli.SUOMI]: hankkeenKuvaus[API.Kieli.SUOMI] };
  Object.keys(API.Kieli).forEach((kieli) => {
    if (hankkeenKuvaus[kieli as API.Kieli]) {
      kuvaus[kieli as API.Kieli] = hankkeenKuvaus[kieli as API.Kieli] || undefined;
    }
  });
  return kuvaus;
}

export function getId(
  vaihe:
    | {
        id: number | undefined;
      }
    | undefined
    | null
): number {
  let id = vaihe?.id;
  if (!id) {
    id = 1;
  }
  return id;
}
