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

export function cleanupGeneratedIdAndTimestampFromFeedbacks(feedbacks?: Palaute[]): Palaute[] | undefined {
  return feedbacks
    ? feedbacks.map((palaute) => {
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
  nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu | NahtavillaoloVaihe
): NahtavillaoloVaiheJulkaisu | NahtavillaoloVaihe {
  nahtavillaoloVaihe.aineistoNahtavilla?.forEach(aineistoCleanupFunc);
  nahtavillaoloVaihe.lisaAineisto?.forEach(aineistoCleanupFunc);
  const lisaAineistoParametrit = (nahtavillaoloVaihe as NahtavillaoloVaihe).lisaAineistoParametrit;
  if (lisaAineistoParametrit) {
    lisaAineistoParametrit.hash = "***unittest***";
    lisaAineistoParametrit.poistumisPaiva = "***unittest***";
    (nahtavillaoloVaihe as NahtavillaoloVaihe)["lisaAineistoParametrit"] = lisaAineistoParametrit;
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

export function cleanupGeneratedIds(obj: Record<string, any>): unknown {
  return Object.keys(obj).reduce((cleanObj, key: string) => {
    const cleanedUpKey: string = key.replace(/[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/g, "***unittest***");
    cleanObj[cleanedUpKey] = obj[key];
    return cleanObj;
  }, {} as Record<string, any>);
}
