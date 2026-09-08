// Contains code generated or recommended by Amazon Q
import { Projekti } from "../graphql/apiModel";

export const isElyJulkaisuEstetty = (projekti: Projekti): boolean => {
  return projekti.velho.suunnittelustaVastaavaViranomainen?.toString().endsWith("ELY") ?? false;
};
