import * as API from "../../../../common/graphql/apiModel";
import { NahtavillaoloVaiheJulkaisu } from "../../../src/database/model";
import { cleanupAnyProjektiData } from "../testFixtureRecorder";

export function cleanupGeneratedIdAndTimestampFromFeedbacks(feedbacks?: API.Palaute[]): API.Palaute[] | undefined {
  return feedbacks
    ? feedbacks.map((palaute) => {
        cleanupAnyProjektiData(palaute);
        palaute.liite = palaute?.liite?.replace(palaute.id, "***unittest***");
        palaute.id = "***unittest***";
        palaute.vastaanotettu = "***unittest***";
        return palaute;
      })
    : undefined;
}

export function cleanupVuorovaikutusKierrosTimestamps(
  vuorovaikutusKierros: API.VuorovaikutusKierros | API.VuorovaikutusKierrosJulkaisu
): void {
  vuorovaikutusKierros.esittelyaineistot?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  vuorovaikutusKierros.suunnitelmaluonnokset?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  if (Object.keys(vuorovaikutusKierros).includes("__typename")) {
    (vuorovaikutusKierros as API.VuorovaikutusKierros).esittelyaineistot?.forEach(aineistoCleanupFunc);
    (vuorovaikutusKierros as API.VuorovaikutusKierros).suunnitelmaluonnokset?.forEach(aineistoCleanupFunc);
  }
}

function aineistoCleanupFunc(aineisto: API.Aineisto) {
  if (aineisto.tuotu) {
    aineisto.tuotu = "***unittest***";
  }
}

export function cleanupNahtavillaoloTimestamps(
  nahtavillaoloVaihe: API.NahtavillaoloVaiheJulkaisu | API.NahtavillaoloVaihe | NahtavillaoloVaiheJulkaisu
): API.NahtavillaoloVaiheJulkaisu | API.NahtavillaoloVaihe | NahtavillaoloVaiheJulkaisu {
  if (Object.keys(nahtavillaoloVaihe).includes("__typename")) {
    (nahtavillaoloVaihe as API.NahtavillaoloVaihe).aineistoNahtavilla?.forEach(aineistoCleanupFunc);
    (nahtavillaoloVaihe as API.NahtavillaoloVaihe).lisaAineisto?.forEach(aineistoCleanupFunc);
  }

  if ((nahtavillaoloVaihe as NahtavillaoloVaiheJulkaisu).hyvaksymisPaiva) {
    (nahtavillaoloVaihe as NahtavillaoloVaiheJulkaisu).hyvaksymisPaiva = "**unittest**";
  }

  const lisaAineistoParametrit = (nahtavillaoloVaihe as API.NahtavillaoloVaihe).lisaAineistoParametrit;
  if (lisaAineistoParametrit) {
    lisaAineistoParametrit.hash = "***unittest***";
    lisaAineistoParametrit.poistumisPaiva = "***unittest***";
    (nahtavillaoloVaihe as API.NahtavillaoloVaihe)["lisaAineistoParametrit"] = lisaAineistoParametrit;
  }
  return nahtavillaoloVaihe;
}

export function cleanupNahtavillaoloJulkaisuJulkinenTimestamps(
  nahtavillaoloVaihe: API.NahtavillaoloVaiheJulkaisuJulkinen
): API.NahtavillaoloVaiheJulkaisuJulkinen {
  nahtavillaoloVaihe.aineistoNahtavilla?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  return nahtavillaoloVaihe;
}

export function cleanupHyvaksymisPaatosVaiheTimestamps(
  vaihe: API.HyvaksymisPaatosVaiheJulkaisu | API.HyvaksymisPaatosVaihe
): API.HyvaksymisPaatosVaiheJulkaisu | API.HyvaksymisPaatosVaihe {
  vaihe.aineistoNahtavilla?.forEach(aineistoCleanupFunc);
  vaihe.hyvaksymisPaatos?.forEach(aineistoCleanupFunc);
  return vaihe;
}

export function cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps(
  hyvaksymisPaatosVaihe: API.HyvaksymisPaatosVaiheJulkaisuJulkinen
): API.HyvaksymisPaatosVaiheJulkaisuJulkinen | undefined {
  if (!hyvaksymisPaatosVaihe) {
    return undefined;
  }
  hyvaksymisPaatosVaihe.aineistoNahtavilla?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  hyvaksymisPaatosVaihe.hyvaksymisPaatos?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  return hyvaksymisPaatosVaihe;
}

export function cleanupGeneratedIds<T extends Record<string, any>>(obj: T): Record<string, any> {
  return Object.keys(obj).reduce((cleanObj: Record<string, any>, key: string) => {
    const cleanedUpKey: string = key.replace(/[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/g, "***unittest***");
    cleanObj[cleanedUpKey] = obj[key] as Record<string, any>;
    return cleanObj;
  }, {} as Record<string, any>);
}
