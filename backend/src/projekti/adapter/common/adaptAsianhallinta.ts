import { AsianhallintaSynkronointi, SynkronointiTila } from "@hassu/asianhallinta";

export const EI_TESTATTAVISSA = "EI_TESTATTAVISSA";

export const getAsianhallintaSynchronizationStatus = (
  synkronoinnit: Record<string, AsianhallintaSynkronointi> | undefined,
  asianhallintaEventId: string | null | undefined
): SynkronointiTila | typeof EI_TESTATTAVISSA =>
  (asianhallintaEventId && synkronoinnit && synkronoinnit[asianhallintaEventId]?.synkronointiTila) || EI_TESTATTAVISSA;
