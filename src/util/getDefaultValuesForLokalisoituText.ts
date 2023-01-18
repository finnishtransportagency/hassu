import {
  Kieli,
  LokalisoituTeksti,
  LokalisoituTekstiInput,
  UudelleenKuulutus,
  UudelleenKuulutusInput,
  UudelleenkuulutusTila,
} from "@services/api";
import { pickBy } from "lodash";
import { ProjektiLisatiedolla } from "src/hooks/useProjekti";

export function getDefaultValuesForLokalisoituText(
  kielitiedot: ProjektiLisatiedolla["kielitiedot"],
  lokalisoituTeksti: LokalisoituTeksti | null | undefined,
  defaultValues?: LokalisoituTeksti
): LokalisoituTekstiInput {
  const { ensisijainenKieli, toissijainenKieli } = kielitiedot || {};
  const hasRuotsinKieli = ensisijainenKieli === Kieli.RUOTSI || toissijainenKieli === Kieli.RUOTSI;
  const hasSaamenKieli = ensisijainenKieli === Kieli.SAAME || toissijainenKieli === Kieli.SAAME;
  return {
    SUOMI: lokalisoituTeksti?.SUOMI || defaultValues?.SUOMI || "",
    ...pickBy(
      {
        RUOTSI: hasRuotsinKieli ? lokalisoituTeksti?.RUOTSI || defaultValues?.RUOTSI || "" : undefined,
        SAAME: hasSaamenKieli ? lokalisoituTeksti?.SAAME || defaultValues?.SAAME || "" : undefined,
      },
      (value) => value !== undefined
    ),
  };
}

export function getDefaultValuesForUudelleenKuulutus(
  kielitiedot: ProjektiLisatiedolla["kielitiedot"],
  uudelleenKuulutus: UudelleenKuulutus | null | undefined
): UudelleenKuulutusInput {
  const uudelleenKuulutusInput: UudelleenKuulutusInput = {
    selosteLahetekirjeeseen: getDefaultValuesForLokalisoituText(kielitiedot, uudelleenKuulutus?.selosteLahetekirjeeseen),
  };
  if (uudelleenKuulutus?.tila === UudelleenkuulutusTila.JULKAISTU_PERUUTETTU) {
    uudelleenKuulutusInput.selosteKuulutukselle = getDefaultValuesForLokalisoituText(kielitiedot, uudelleenKuulutus?.selosteKuulutukselle);
  }
  return uudelleenKuulutusInput;
}
