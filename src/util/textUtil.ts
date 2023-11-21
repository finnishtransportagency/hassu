import { Kieli, Kielitiedot } from "common/graphql/apiModel";
import lowerCase from "lodash/lowerCase";

export function label({
  label,
  inputLanguage,
  kielitiedot,
  required,
}: {
  label: string;
  inputLanguage: Kieli;
  kielitiedot: Kielitiedot;
  required?: boolean;
}): string {
  const { ensisijainenKieli, toissijainenKieli } = kielitiedot;
  if (!toissijainenKieli || toissijainenKieli === Kieli.POHJOISSAAME) {
    return `${label}${required ? " *" : ""}`;
  } else {
    if (inputLanguage === ensisijainenKieli) {
      return `${label} ensisijaisella kielellä (${lowerCase(ensisijainenKieli)})${required ? " *" : ""}`;
    } else {
      return `${label} toissijaisella kielellä (${lowerCase(toissijainenKieli)})${required ? " *" : ""}`;
    }
  }
}
