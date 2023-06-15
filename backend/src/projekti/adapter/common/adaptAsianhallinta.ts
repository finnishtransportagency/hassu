import { AsianhallintaSynkronointi, SynkronointiTila } from "@hassu/asianhallinta";

export function getAsianhallintaSynchronizationStatus(
  synkronoinnit: Record<string, AsianhallintaSynkronointi> | undefined,
  asianhallintaEventId: string | null | undefined
): SynkronointiTila | undefined {
  if (!asianhallintaEventId || !synkronoinnit) {
    return undefined;
  }
  return synkronoinnit[asianhallintaEventId]?.synkronointiTila;
}
