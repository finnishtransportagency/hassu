import * as API from "../../../../../common/graphql/apiModel";
import { UudelleenKuulutusInput } from "../../../../../common/graphql/apiModel";
import { AloitusKuulutus, UudelleenKuulutus } from "../../../database/model";
import { adaptHankkeenKuvausToSave, adaptIlmoituksenVastaanottajatToSave, adaptStandardiYhteystiedotToSave, getId } from "./common";
import mergeWith from "lodash/mergeWith";

export function adaptAloitusKuulutusToSave(
  dbAloituskuulutus: AloitusKuulutus | undefined | null,
  aloitusKuulutus: API.AloitusKuulutusInput | undefined | null
): AloitusKuulutus | undefined | null {
  if (!aloitusKuulutus) {
    return aloitusKuulutus;
  }

  const { hankkeenKuvaus, ilmoituksenVastaanottajat, kuulutusYhteystiedot, uudelleenKuulutus, ...rest } = aloitusKuulutus;

  const id = getId(dbAloituskuulutus);

  const aloitusKuulutusToSave: AloitusKuulutus = mergeWith(dbAloituskuulutus, {
    id,
    ...rest,
  });

  if (hankkeenKuvaus) {
    aloitusKuulutusToSave.hankkeenKuvaus = adaptHankkeenKuvausToSave(hankkeenKuvaus);
  }

  if (ilmoituksenVastaanottajat) {
    aloitusKuulutusToSave.ilmoituksenVastaanottajat = adaptIlmoituksenVastaanottajatToSave(ilmoituksenVastaanottajat);
  }

  if (kuulutusYhteystiedot) {
    aloitusKuulutusToSave.kuulutusYhteystiedot = adaptStandardiYhteystiedotToSave(kuulutusYhteystiedot);
  }

  if (uudelleenKuulutus) {
    aloitusKuulutusToSave.uudelleenKuulutus = adaptUudelleenKuulutusToSave(dbAloituskuulutus?.uudelleenKuulutus, uudelleenKuulutus);
  }

  return aloitusKuulutusToSave;
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
