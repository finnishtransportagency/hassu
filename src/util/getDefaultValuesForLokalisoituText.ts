import {
  Kieli,
  LokalisoituTeksti,
  LokalisoituTekstiInput,
  UudelleenKuulutus,
  UudelleenKuulutusInput,
  UudelleenkuulutusTila,
} from "@services/api";
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
  uudelleenKuulutusInput.tiedotaKiinteistonomistajia = uudelleenKuulutus?.tiedotaKiinteistonomistajia ?? true;
  return uudelleenKuulutusInput;
}
