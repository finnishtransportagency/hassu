import { Projekti } from "../graphql/apiModel";
import { isEvkAktivoituAt } from "./isEvkAktivoitu";

export const isEvkJulkaisuEstetty = (projekti: Projekti, when: string): boolean => {
  if (!isEvk(projekti)) {
    return false;
  }
  if (!isUspaKaytossa(projekti)) {
    return false;
  }
  return isEvkAktivoituAt(when);
};

const isEvk = (projekti: Projekti): boolean => {
  return projekti.velho.suunnittelustaVastaavaViranomainen?.toString().endsWith("EVK") ?? false;
}

const isUspaKaytossa = (projekti: Projekti): boolean => {
  return !(projekti.asianhallinta.inaktiivinen);
};
