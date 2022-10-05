import * as API from "../../../../../common/graphql/apiModel";
import { AloitusKuulutus } from "../../../database/model";
import { adaptIlmoituksenVastaanottajatToSave, adaptStandardiYhteystiedotToSave } from "./common";
import { IllegalArgumentError } from "../../../error/IllegalArgumentError";
import { adaptHankkeenKuvausToSave } from "../common";

export function adaptAloitusKuulutusToSave(aloitusKuulutus: API.AloitusKuulutusInput | undefined | null): AloitusKuulutus | undefined {
  if (aloitusKuulutus) {
    const { hankkeenKuvaus, ilmoituksenVastaanottajat, kuulutusYhteystiedot, ...rest } = aloitusKuulutus;
    if (!hankkeenKuvaus) {
      throw new IllegalArgumentError("Aloituskuulutuksella on oltava hankkeenKuvaus!");
    }
    if (!kuulutusYhteystiedot) {
      throw new IllegalArgumentError("Aloituskuulutuksella on oltava kuulutusYhteystiedot!");
    }
    if (!ilmoituksenVastaanottajat) {
      throw new IllegalArgumentError("Aloituskuulutuksella on oltava ilmoituksenVastaanottajat!");
    }
    return {
      ...rest,
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToSave(ilmoituksenVastaanottajat), //pakko tukea vielä tätä
      hankkeenKuvaus: adaptHankkeenKuvausToSave(hankkeenKuvaus),
      kuulutusYhteystiedot: adaptStandardiYhteystiedotToSave(kuulutusYhteystiedot, true),
    };
  }
  return aloitusKuulutus as undefined;
}
