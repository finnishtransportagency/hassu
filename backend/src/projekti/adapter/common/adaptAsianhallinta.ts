import { AsianhallintaSynkronointi, SynkronointiTila } from "@hassu/asianhallinta";
import { AsianTila } from "hassu-common/graphql/apiModel";
import { synkronointiTilaToAsianTilaMap } from "../../../asianhallinta/synkronointiTilaToAsianTilaMap";

export const getAsianhallintaSynchronizationStatus = (
  synkronoinnit: Record<string, AsianhallintaSynkronointi> | undefined,
  asianhallintaEventId: string | null | undefined
): AsianTila | undefined => {
  if (asianhallintaEventId && synkronoinnit?.[asianhallintaEventId]?.dokumentit) {
    const synkronointi = synkronoinnit[asianhallintaEventId];
    // Käy läpi synkronointi.dokumentit.synkronointiTila
    // Jos synkrnonointiTila ASIANHALLINTA_VAARASSA_TILASSA, ASIAA_EI_LOYDY tai VIRHE löytyy, palauta se.
    // Jos kaikki dokumentit on synkronoitu, palauta SYNKRONOITU
    // Jos mikään ei löydy, palauta undefined

    const tilat = synkronointi.dokumentit.map((dokumentti) => dokumentti.synkronointiTila);
    const virheTila =
      getTilaIfExists(tilat, "ASIANHALLINTA_VAARASSA_TILASSA") ??
      getTilaIfExists(tilat, "ASIAA_EI_LOYDY") ??
      getTilaIfExists(tilat, "VIRHE");
    if (virheTila) {
      return synkronointiTilaToAsianTilaMap[virheTila];
    }

    for (const dokumentti of synkronointi.dokumentit) {
      if (dokumentti.synkronointiTila !== "SYNKRONOITU") {
        return undefined; // Synkronointia ei ole tehty
      }
    }

    return AsianTila.SYNKRONOITU;
  }
  return AsianTila.EI_TESTATTAVISSA;
};

function getTilaIfExists(tilat: (SynkronointiTila | undefined)[], tila: SynkronointiTila) {
  if (tilat.includes(tila)) {
    return tila;
  }
}
