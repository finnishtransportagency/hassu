import {
  Aineisto,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  HyvaksymisPaatosVaiheJulkaisuJulkinen,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  NahtavillaoloVaiheJulkaisuJulkinen,
  Palaute,
  Vuorovaikutus,
} from "../../../../common/graphql/apiModel";
import { NahtavillaoloVaiheJulkaisu as DBNahtavillaoloVaiheJulkaisu } from "../../../src/database/model";
import { cleanupAnyProjektiData } from "../testFixtureRecorder";

export function cleanupGeneratedIdAndTimestampFromFeedbacks(feedbacks?: Palaute[]): Palaute[] | undefined {
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

export function cleanupVuorovaikutusTimestamps(vuorovaikutukset: Vuorovaikutus[]): void {
  vuorovaikutukset.forEach((vuorovaikutus) => {
    vuorovaikutus.esittelyaineistot?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
    vuorovaikutus.suunnitelmaluonnokset?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  });
}

function aineistoCleanupFunc(aineisto: Aineisto) {
  if (aineisto.tuotu) {
    aineisto.tuotu = "***unittest***";
  }
}

export function cleanupNahtavillaoloTimestamps(
  nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu | NahtavillaoloVaihe | DBNahtavillaoloVaiheJulkaisu
): NahtavillaoloVaiheJulkaisu | NahtavillaoloVaihe | DBNahtavillaoloVaiheJulkaisu {
  if (Object.keys(nahtavillaoloVaihe).includes("__typename")) {
    (nahtavillaoloVaihe as NahtavillaoloVaihe).aineistoNahtavilla?.forEach(aineistoCleanupFunc);
    (nahtavillaoloVaihe as NahtavillaoloVaihe).lisaAineisto?.forEach(aineistoCleanupFunc);
  }

  const lisaAineistoParametrit = (nahtavillaoloVaihe as NahtavillaoloVaihe).lisaAineistoParametrit;
  if (lisaAineistoParametrit) {
    lisaAineistoParametrit.hash = "***unittest***";
    lisaAineistoParametrit.poistumisPaiva = "***unittest***";
    (nahtavillaoloVaihe as NahtavillaoloVaihe)["lisaAineistoParametrit"] = lisaAineistoParametrit;
  }
  if ((nahtavillaoloVaihe as DBNahtavillaoloVaiheJulkaisu).hyvaksymisPaiva) {
    (nahtavillaoloVaihe as DBNahtavillaoloVaiheJulkaisu).hyvaksymisPaiva = "***unittest***";
  }
  return nahtavillaoloVaihe;
}

export function cleanupNahtavillaoloJulkaisuJulkinenTimestamps(
  nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisuJulkinen
): NahtavillaoloVaiheJulkaisuJulkinen {
  nahtavillaoloVaihe.aineistoNahtavilla?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  return nahtavillaoloVaihe;
}

export function cleanupHyvaksymisPaatosVaiheTimestamps(
  vaihe: HyvaksymisPaatosVaiheJulkaisu | HyvaksymisPaatosVaihe
): HyvaksymisPaatosVaiheJulkaisu | HyvaksymisPaatosVaihe {
  vaihe.aineistoNahtavilla?.forEach(aineistoCleanupFunc);
  vaihe.hyvaksymisPaatos?.forEach(aineistoCleanupFunc);
  return vaihe;
}

export function cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps(
  hyvaksymisPaatosVaihe: HyvaksymisPaatosVaiheJulkaisuJulkinen
): HyvaksymisPaatosVaiheJulkaisuJulkinen | undefined {
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
