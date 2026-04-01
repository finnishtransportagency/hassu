import { JulkaisuByPrefix, JulkaisuPrefix } from "./model";

function padNumber(num: number, length = 3) {
  return String(num).padStart(length, "0");
}

export function createJulkaisuSortKey<P extends JulkaisuPrefix>(julkaisuPrefix: P, julkaisunId: number): JulkaisuByPrefix<P>["sortKey"] {
  return `${julkaisuPrefix}${padNumber(julkaisunId)}`;
}
