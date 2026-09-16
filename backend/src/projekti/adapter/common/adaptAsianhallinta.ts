// Contains code generated or recommended by Amazon Q
import { AsianhallintaSynkronointi, SynkronointiTila } from "@hassu/asianhallinta";
import { AsianTila } from "hassu-common/graphql/apiModel";
import { synkronointiTilaToAsianTilaMap } from "../../../asianhallinta/synkronointiTilaToAsianTilaMap";

export const getAsianhallintaSynchronizationStatus = (
  synkronoinnit: Record<string, AsianhallintaSynkronointi> | undefined,
  asianhallintaEventId: string | null | undefined,
  odotaMaanomistajaluetteloa = true
): AsianTila | undefined => {
  if (asianhallintaEventId && synkronoinnit?.[asianhallintaEventId]?.dokumentit) {
    const virheTila = getSynkronointiVirheTila(synkronoinnit[asianhallintaEventId]);
    if (virheTila) {
      return synkronointiTilaToAsianTilaMap[virheTila];
    }

    if (odotaMaanomistajaluetteloa) {
      const maanomistajaluetteloEventId = asianhallintaEventId + "_maanomistajaluettelo";
      const maanomistajaluetteloSynkronointi = synkronoinnit[maanomistajaluetteloEventId];
      if (!maanomistajaluetteloSynkronointi?.dokumentit) {
        return undefined; // maanomistajaluetteloa ei ole vielä lähetetty
      }
      const maanomistajaVirheTila = getSynkronointiVirheTila(maanomistajaluetteloSynkronointi);
      if (maanomistajaVirheTila) {
        return synkronointiTilaToAsianTilaMap[maanomistajaVirheTila];
      }
      for (const dokumentti of maanomistajaluetteloSynkronointi.dokumentit) {
        if (dokumentti.synkronointiTila !== "SYNKRONOITU") {
          return undefined;
        }
      }
    }

    for (const dokumentti of synkronoinnit[asianhallintaEventId].dokumentit) {
      if (dokumentti.synkronointiTila !== "SYNKRONOITU") {
        return undefined; // Synkronointia ei ole tehty
      }
    }

    return AsianTila.SYNKRONOITU;
  }
  return AsianTila.EI_TESTATTAVISSA;
};

function getSynkronointiVirheTila(synkronointi: AsianhallintaSynkronointi): SynkronointiTila | undefined {
  const tilat = synkronointi.dokumentit.map((d) => d.synkronointiTila);
  return (
    getTilaIfExists(tilat, "ASIANHALLINTA_VAARASSA_TILASSA") ?? getTilaIfExists(tilat, "ASIAA_EI_LOYDY") ?? getTilaIfExists(tilat, "VIRHE")
  );
}

function getTilaIfExists(tilat: (SynkronointiTila | undefined)[], tila: SynkronointiTila) {
  if (tilat.includes(tila)) {
    return tila;
  }
}
