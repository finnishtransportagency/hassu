import * as API from "hassu-common/graphql/apiModel";
import { AloitusKuulutus } from "../../../database/model";
import {
  adaptHankkeenKuvausToSave,
  adaptIlmoituksenVastaanottajatToSave,
  adaptStandardiYhteystiedotToSave,
  getId,
  adaptKuulutusSaamePDFtInput,
  adaptUudelleenKuulutusToSave,
} from "./common";
import mergeWith from "lodash/mergeWith";
import { preventArrayMergingCustomizer } from "../../../util/preventArrayMergingCustomizer";

export function adaptAloitusKuulutusToSave(
  dbAloituskuulutus: AloitusKuulutus | undefined | null,
  aloitusKuulutus: API.AloitusKuulutusInput | undefined | null
): AloitusKuulutus | undefined | null {
  if (!aloitusKuulutus) {
    return aloitusKuulutus;
  }

  const { hankkeenKuvaus, ilmoituksenVastaanottajat, kuulutusYhteystiedot, uudelleenKuulutus, aloituskuulutusSaamePDFt, ...rest } =
    aloitusKuulutus;

  const id = getId(dbAloituskuulutus);

  const aloitusKuulutusToSave: AloitusKuulutus = mergeWith(
    {},
    dbAloituskuulutus,
    {
      id,
      ...rest,
    },
    preventArrayMergingCustomizer
  );

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

  if (aloituskuulutusSaamePDFt) {
    aloitusKuulutusToSave.aloituskuulutusSaamePDFt = adaptKuulutusSaamePDFtInput(
      dbAloituskuulutus?.aloituskuulutusSaamePDFt,
      aloituskuulutusSaamePDFt
    );
  }

  return aloitusKuulutusToSave;
}
