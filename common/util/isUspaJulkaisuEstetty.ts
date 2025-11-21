import { Projekti } from "../graphql/apiModel";
import { isEvkAktivoituAt } from "./isEvkAktivoitu";

export const isUspaJulkaisuEstetty = (projekti: Projekti, when: string): boolean => {
  if (!isElyOrEvk(projekti)) {
    return false;
  }
  if (isEly(projekti)) {
    return isEvkAktivoituAt(when);
  }
  if (!isUspaKaytossa(projekti)) {
    return false;
  }
  return isEvkAktivoituAt(when);
};

const isElyOrEvk = (projekti: Projekti): boolean => {
  return (isEly(projekti) || isEvk(projekti));
};

const isEly = (projekti: Projekti): boolean => {
  return projekti.velho.suunnittelustaVastaavaViranomainen?.toString().endsWith("ELY") ?? false;
}

const isEvk = (projekti: Projekti): boolean => {
  return projekti.velho.suunnittelustaVastaavaViranomainen?.toString().endsWith("EVK") ?? false;
}

const isUspaKaytossa = (projekti: Projekti): boolean => {
  return !(projekti.asianhallinta.inaktiivinen);
};
