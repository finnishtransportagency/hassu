import { Kieli } from "./graphql/apiModel";

export type KaannettavaKieli = Kieli.SUOMI | Kieli.RUOTSI;

export function isKieliTranslatable(kieli: Kieli | undefined | null): boolean {
  if (!kieli) return false;
  return [Kieli.SUOMI, Kieli.RUOTSI].includes(kieli);
}
