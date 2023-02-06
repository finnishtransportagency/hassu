import { Kieli, Kielitiedot } from "@services/api";

export function poistaTypeNameJaTurhatKielet<A extends Record<string, any>>(
  obj: A | undefined | null,
  kielitiedot: Kielitiedot | undefined | null
): A | undefined | null {
  if (!obj) {
    return obj;
  }
  Object.keys(obj).forEach((key) => {
    if (![kielitiedot?.ensisijainenKieli, kielitiedot?.toissijainenKieli].includes(key as Kieli) || key === "__typename") {
      delete obj[key];
    }
  });
  return obj;
}
