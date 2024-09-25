import { Kieli, LokalisoituTeksti, LokalisoituTekstiInput } from "@services/api";
import pickBy from "lodash/pickBy";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";

export function getDefaultValuesForLokalisoituText(
  kielitiedot: ProjektiLisatiedolla["kielitiedot"],
  lokalisoituTeksti: LokalisoituTeksti | LokalisoituTekstiInput | null | undefined
): LokalisoituTekstiInput {
  const { ensisijainenKieli, toissijainenKieli } = kielitiedot || {};
  const hasRuotsinKieli = ensisijainenKieli === Kieli.RUOTSI || toissijainenKieli === Kieli.RUOTSI;
  return {
    SUOMI: lokalisoituTeksti?.SUOMI || "",
    ...pickBy(
      {
        RUOTSI: hasRuotsinKieli ? lokalisoituTeksti?.RUOTSI : undefined,
      },
      (value) => value !== undefined
    ),
  };
}
