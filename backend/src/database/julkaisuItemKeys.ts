import { JulkaisuTypeMap } from "./model";

function padNumber(num: number, length = 3) {
  return String(num).padStart(length, "0");
}

export function createJulkaisuSortKey<P extends keyof JulkaisuTypeMap>(julkaisuPrefix: P, julkaisunId: number): `${P}${string}` {
  return `${julkaisuPrefix}${padNumber(julkaisunId)}`;
}
