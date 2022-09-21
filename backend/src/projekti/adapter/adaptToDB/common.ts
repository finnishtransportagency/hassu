import * as API from "../../../../../common/graphql/apiModel";
import { IllegalArgumentError } from "../../../error/IllegalArgumentError";
import { Aineisto, LocalizedMap } from "../../../database/model";
import { AineistoChangedEvent, ProjektiAdaptationResult, ProjektiEventType } from "../projektiAdapter";
import remove from "lodash/remove";
import { IlmoituksenVastaanottajat, ViranomaisVastaanottaja, KuntaVastaanottaja } from "../../../database/model";

export function adaptIlmoituksenVastaanottajatToSave(
  vastaanottajat: API.IlmoituksenVastaanottajatInput | null | undefined
): IlmoituksenVastaanottajat {
  if (!vastaanottajat) {
    return vastaanottajat as null | undefined;
  }
  const kunnat: KuntaVastaanottaja[] = vastaanottajat?.kunnat;
  if (!vastaanottajat?.viranomaiset || vastaanottajat.viranomaiset.length === 0) {
    throw new IllegalArgumentError("Viranomaisvastaanottajia pitää olla vähintään yksi.");
  }
  const viranomaiset: ViranomaisVastaanottaja[] = vastaanottajat?.viranomaiset;
  return { kunnat, viranomaiset };
}

export function adaptYhteystiedotToSave(yhteystietoInputs: Array<API.YhteystietoInput>): API.YhteystietoInput[] | undefined {
  return yhteystietoInputs?.length > 0 ? yhteystietoInputs.map((yt) => ({ ...yt })) : undefined;
}

export function adaptYhteysHenkilotToSave(yhteystiedot: string[]): string[] {
  return yhteystiedot.filter((yt, index) => yhteystiedot.indexOf(yt) === index);
}

export function adaptStandardiYhteystiedot(kuulutusYhteystiedot: API.StandardiYhteystiedotInput): API.StandardiYhteystiedotInput {
  return {
    yhteysTiedot: adaptYhteystiedotToSave(kuulutusYhteystiedot.yhteysTiedot),
    yhteysHenkilot: adaptYhteysHenkilotToSave(kuulutusYhteystiedot.yhteysHenkilot),
  };
}

export function adaptHankkeenKuvausToSave(hankkeenKuvaus: API.HankkeenKuvauksetInput): LocalizedMap<string> {
  if (!hankkeenKuvaus) {
    return undefined;
  }
  return { ...hankkeenKuvaus };
}

export function adaptAineistotToSave(
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

function pickAineistoFromInputByDocumenttiOid(aineistotInput: API.AineistoInput[], dokumenttiOid: string) {
  const matchedElements = remove(aineistotInput, { dokumenttiOid });
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
  const result = { ...o };
  delete result["__typename"];
  return result;
}
