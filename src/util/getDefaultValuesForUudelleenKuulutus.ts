import { UudelleenKuulutus, UudelleenKuulutusInput, UudelleenkuulutusTila } from "@services/api";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";
import { getDefaultValuesForLokalisoituText } from "./getDefaultValuesForLokalisoituText";

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
