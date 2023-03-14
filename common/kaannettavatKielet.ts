import { Kieli } from "./graphql/apiModel";

export type KaannettavaKieli = Kieli.SUOMI | Kieli.RUOTSI;

export function kieliIsTranslatable(kieli: Kieli): boolean {
  return [Kieli.SUOMI, Kieli.RUOTSI].includes(kieli);
}
