import {
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  NahtavillaoloVaiheJulkaisuJulkinen,
  Palaute,
  Vuorovaikutus,
} from "../../../../common/graphql/apiModel";

export function cleanupGeneratedIdAndTimestampFromFeedbacks(feedbacks?: Palaute[]): Palaute[] {
  return feedbacks
    ? feedbacks.map((palaute) => {
        palaute.liite = palaute.liite.replace(palaute.id, "***unittest***");
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

export function cleanupNahtavillaoloTimestamps(
  nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisu | NahtavillaoloVaihe
): NahtavillaoloVaiheJulkaisu | NahtavillaoloVaihe {
  nahtavillaoloVaihe.aineistoNahtavilla?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  nahtavillaoloVaihe.lisaAineisto?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  return nahtavillaoloVaihe;
}

export function cleanupNahtavillaoloJulkaisuJulkinenTimestamps(
  nahtavillaoloVaihe: NahtavillaoloVaiheJulkaisuJulkinen
): NahtavillaoloVaiheJulkaisuJulkinen {
  nahtavillaoloVaihe.aineistoNahtavilla?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  return nahtavillaoloVaihe;
}

export function cleanupGeneratedIds(obj: unknown) {
  return Object.keys(obj).reduce((cleanObj, key) => {
    const cleanedUpKey = key.replace(/[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/g, "***unittest***");
    cleanObj[cleanedUpKey] = obj[key];
    return cleanObj;
  }, {});
}
