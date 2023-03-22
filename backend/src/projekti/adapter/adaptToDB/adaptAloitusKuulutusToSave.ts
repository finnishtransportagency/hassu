import * as API from "../../../../../common/graphql/apiModel";
import { KuulutusPDFInput, KuulutusSaamePDFtInput, UudelleenKuulutusInput } from "../../../../../common/graphql/apiModel";
import { AloitusKuulutus, KuulutusSaamePDF, KuulutusSaamePDFt, SaameKieli, UudelleenKuulutus } from "../../../database/model";
import { adaptHankkeenKuvausToSave, adaptIlmoituksenVastaanottajatToSave, adaptStandardiYhteystiedotToSave, getId } from "./common";
import mergeWith from "lodash/mergeWith";

function adaptLadattuTiedostoToSave(
  pdft: KuulutusSaamePDF,
  dbField: keyof KuulutusSaamePDF,
  kuulutusPDFInputForKieli: KuulutusPDFInput,
  inputField: keyof KuulutusPDFInput
) {
  let dbLadattuTiedosto = pdft[dbField];
  const inputTiedostoPath = kuulutusPDFInputForKieli[inputField];
  if (inputTiedostoPath == null) {
    if (dbLadattuTiedosto) {
      dbLadattuTiedosto.nimi = null;
    }
  }
  if (inputTiedostoPath) {
    if (!dbLadattuTiedosto) {
      dbLadattuTiedosto = { tiedosto: inputTiedostoPath };
      pdft[dbField] = dbLadattuTiedosto;
    } else {
      dbLadattuTiedosto.tiedosto = inputTiedostoPath;
      dbLadattuTiedosto.tuotu = undefined;
      dbLadattuTiedosto.nimi = undefined;
    }
  }
}

export function adaptKuulutusSaamePDFtInput(
  dbKuulutusSaamePDFt: KuulutusSaamePDFt | undefined | null,
  pdftInput: KuulutusSaamePDFtInput
): KuulutusSaamePDFt | undefined | null {
  if (!pdftInput) {
    return dbKuulutusSaamePDFt;
  }
  let kieli: keyof KuulutusSaamePDFtInput;
  let result = dbKuulutusSaamePDFt;
  for (kieli in pdftInput) {
    const kuulutusPDFInputForKieli: KuulutusPDFInput | undefined | null = pdftInput[kieli];
    if (kuulutusPDFInputForKieli) {
      if (!result) {
        result = {};
      }
      let dbPDFt = result[kieli as SaameKieli];
      if (!dbPDFt) {
        dbPDFt = {};
        result[kieli as SaameKieli] = dbPDFt;
      }

      adaptLadattuTiedostoToSave(dbPDFt, "kuulutusPDF", kuulutusPDFInputForKieli, "kuulutusPDFPath");
      adaptLadattuTiedostoToSave(dbPDFt, "kuulutusIlmoitusPDF", kuulutusPDFInputForKieli, "kuulutusIlmoitusPDFPath");
    }
  }

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
