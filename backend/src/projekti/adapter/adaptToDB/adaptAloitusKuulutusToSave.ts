import * as API from "../../../../../common/graphql/apiModel";
import { KuulutusPDFInput, KuulutusSaamePDFtInput, UudelleenKuulutusInput } from "../../../../../common/graphql/apiModel";
import { AloitusKuulutus, KuulutusSaamePDFt, UudelleenKuulutus } from "../../../database/model";
import {
  adaptHankkeenKuvausToSave,
  adaptIlmoituksenVastaanottajatToSave,
  adaptLadattuTiedostoToSave,
  adaptStandardiYhteystiedotToSave,
  forEverySaameDo,
  getId,
} from "./common";
import mergeWith from "lodash/mergeWith";

export function adaptKuulutusSaamePDFtInput(
  dbKuulutusSaamePDFt: KuulutusSaamePDFt | undefined | null,
  pdftInput: KuulutusSaamePDFtInput
): KuulutusSaamePDFt | undefined | null {
  if (!pdftInput) {
    return dbKuulutusSaamePDFt;
  }
  let result = dbKuulutusSaamePDFt;
  forEverySaameDo((kieli) => {
    const kuulutusPDFInputForKieli: KuulutusPDFInput | undefined | null = pdftInput[kieli];
    if (kuulutusPDFInputForKieli) {
      if (!result) {
        result = {};
      }
      let dbPDFt = result[kieli];
      if (!dbPDFt) {
        dbPDFt = {};
        result[kieli] = dbPDFt;
      }

      dbPDFt.kuulutusPDF = adaptLadattuTiedostoToSave(dbPDFt.kuulutusPDF, kuulutusPDFInputForKieli.kuulutusPDFPath);
      dbPDFt.kuulutusIlmoitusPDF = adaptLadattuTiedostoToSave(dbPDFt.kuulutusIlmoitusPDF, kuulutusPDFInputForKieli.kuulutusIlmoitusPDFPath);
    }
  });

  return result;
}

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

  const aloitusKuulutusToSave: AloitusKuulutus = mergeWith({}, dbAloituskuulutus, {
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

  if (aloituskuulutusSaamePDFt) {
    aloitusKuulutusToSave.aloituskuulutusSaamePDFt = adaptKuulutusSaamePDFtInput(
      dbAloituskuulutus?.aloituskuulutusSaamePDFt,
      aloituskuulutusSaamePDFt
    );
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
