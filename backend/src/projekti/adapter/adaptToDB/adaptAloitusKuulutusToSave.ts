import * as API from "../../../../../common/graphql/apiModel";
import { UudelleenKuulutusInput } from "../../../../../common/graphql/apiModel";
import { AloitusKuulutus, UudelleenKuulutus } from "../../../database/model";
import { adaptHankkeenKuvausToSave, adaptIlmoituksenVastaanottajatToSave, adaptStandardiYhteystiedotToSave } from "./common";
import { IllegalArgumentError } from "../../../error/IllegalArgumentError";
import mergeWith from "lodash/mergeWith";

export function adaptAloitusKuulutusToSave(
  dbAloituskuulutus: AloitusKuulutus | undefined | null,
  aloitusKuulutus: API.AloitusKuulutusInput | undefined | null
): AloitusKuulutus | undefined {
  if (aloitusKuulutus) {
    const { hankkeenKuvaus, ilmoituksenVastaanottajat, kuulutusYhteystiedot, uudelleenKuulutus, ...rest } = aloitusKuulutus;
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
      kuulutusYhteystiedot: adaptStandardiYhteystiedotToSave(kuulutusYhteystiedot),
      uudelleenKuulutus: adaptUudelleenKuulutusToSave(dbAloituskuulutus?.uudelleenKuulutus, uudelleenKuulutus),
    };
  }
  return aloitusKuulutus as undefined;
}

export function adaptUudelleenKuulutusToSave(
  uudelleenKuulutus: UudelleenKuulutus | null | undefined,
  input: UudelleenKuulutusInput | null | undefined
): UudelleenKuulutus | null | undefined {
  if (!input) {
    return uudelleenKuulutus;
  }
  return mergeWith({}, uudelleenKuulutus, input);
}
