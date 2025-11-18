import { Projekti } from "../graphql/apiModel";
import { isEvkAktivoituAt } from "./isEvkAktivoitu";

export const isUspaJulkaisuEstetty = (projekti: Projekti, when: string): boolean => {
  if (!isElyOrEvk(projekti)) {
    //console.log('Ei ole ELY/EVK');
    return false;
  }
  if (!isUspaKaytossa(projekti)) {
    //console.log('Ei ole USPA käytössä');
    return false;
  }
  return isEvkAktivoituAt(when);
};

const isElyOrEvk = (projekti: Projekti): boolean => {
  return (projekti.velho.suunnittelustaVastaavaViranomainen?.toString().endsWith("ELY") ||
    projekti.velho.suunnittelustaVastaavaViranomainen?.toString().endsWith("EVK")) ?? false;
};

const isUspaKaytossa = (projekti: Projekti): boolean => {
  return !(projekti.asianhallinta.inaktiivinen);
};
