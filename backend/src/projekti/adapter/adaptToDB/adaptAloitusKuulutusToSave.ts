import * as API from "../../../../../common/graphql/apiModel";
import { AloitusKuulutus } from "../../../database/model";
import { adaptHankkeenKuvausToSave, adaptIlmoituksenVastaanottajatToSave, adaptStandardiYhteystiedotToSave } from "./common";
import { IllegalArgumentError } from "../../../error/IllegalArgumentError";

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
      // Koska kuulutusYhteystiedot on määritelty, adaptStandardiYhteystiedotByAddingTypename palauttaa ei-undefined arvon
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      kuulutusYhteystiedot: adaptStandardiYhteystiedotToSave(kuulutusYhteystiedot),
    };
  }
  return aloitusKuulutus as undefined;
}
