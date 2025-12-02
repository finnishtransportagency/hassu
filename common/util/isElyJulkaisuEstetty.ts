import { Projekti } from "../graphql/apiModel";
import { isEvkAktivoituAt } from "./isEvkAktivoitu";

export const isElyJulkaisuEstetty = (projekti: Projekti, when: string): boolean => {
  if (!isElySuunnittelustaVastaavaViranomainen(projekti)) {
    return false;
  }
  return isEvkAktivoituAt(when);
};

const isElySuunnittelustaVastaavaViranomainen = (projekti: Projekti): boolean => {
  return projekti.velho.suunnittelustaVastaavaViranomainen?.toString().endsWith("ELY") ?? false;
}
