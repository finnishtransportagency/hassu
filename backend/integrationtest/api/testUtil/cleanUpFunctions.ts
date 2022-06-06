import { Vuorovaikutus, Palaute } from "../../../../common/graphql/apiModel";

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
