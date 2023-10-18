import { Kieli } from "common/graphql/apiModel";
import lowerCase from "lodash/lowerCase";

// Assume ensisijainenKieli is always Kieli.SUOMI
export function label({
  label,
  inputLanguage,
  toissijainenKieli,
  required,
}: {
  label: string;
  inputLanguage: Kieli;
  toissijainenKieli?: Kieli | null;
  required?: boolean;
}): string {
  if (!toissijainenKieli || toissijainenKieli === Kieli.POHJOISSAAME) {
    return `${label}${required ? " *" : ""}`;
  } else {
    if (inputLanguage === Kieli.SUOMI) {
      return `${label} ensisijaisella kielellä (suomi)${required ? " *" : ""}`;
    } else {
      return `${label} toissijaisella kielellä (${lowerCase(toissijainenKieli)})${required ? " *" : ""}`;
    }
  }
}
