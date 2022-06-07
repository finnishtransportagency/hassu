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
    vuorovaikutus.aineistot?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  });
}

export function cleanupGeneratedIds(obj: unknown) {
  return Object.keys(obj).reduce((cleanObj, key) => {
    const cleanedUpKey = key.replace(/[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/g, "***unittest***");
    cleanObj[cleanedUpKey] = obj[key];
    return cleanObj;
  }, {});
}
