import { AsianhallintaSynkronointi, SynkronointiTila } from "@hassu/asianhallinta";

export const getAsianhallintaSynchronizationStatus = (
  synkronoinnit: Record<string, AsianhallintaSynkronointi> | undefined,
  asianhallintaEventId: string | null | undefined
): SynkronointiTila | "EI_TESTATTAVISSA" =>
  (asianhallintaEventId && synkronoinnit && synkronoinnit[asianhallintaEventId]?.synkronointiTila) || "EI_TESTATTAVISSA";
