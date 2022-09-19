import * as API from "../../../../../common/graphql/apiModel";
import { AloitusKuulutus } from "../../../database/model";
import { adaptHankkeenKuvausToSave, adaptIlmoituksenVastaanottajatToSave } from "./common";
import { adaptStandardiYhteystiedotByAddingTypename } from "../common";

export function adaptAloitusKuulutusToSave(aloitusKuulutus: API.AloitusKuulutusInput): AloitusKuulutus | null | undefined {
  if (aloitusKuulutus) {
    const { hankkeenKuvaus, ilmoituksenVastaanottajat, kuulutusYhteystiedot, ...rest } = aloitusKuulutus;
    return {
      ...rest,
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToSave(ilmoituksenVastaanottajat), //pakko tukea vielä tätä
      hankkeenKuvaus: adaptHankkeenKuvausToSave(hankkeenKuvaus),
      kuulutusYhteystiedot: adaptStandardiYhteystiedotByAddingTypename(kuulutusYhteystiedot),
    };
  }
  return aloitusKuulutus as undefined;
}
