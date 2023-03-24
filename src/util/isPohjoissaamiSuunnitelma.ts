import { Kieli, Kielitiedot } from "@services/api";

export function isPohjoissaameSuunnitelma(kielitiedot: Kielitiedot | null | undefined): boolean {
  return [kielitiedot?.ensisijainenKieli, kielitiedot?.toissijainenKieli].includes(Kieli.POHJOISSAAME);
}
