import { Projekti, ProjektiJulkinen, Viranomainen } from "@services/api";

export default function getAsiatunnus(projekti: Projekti | ProjektiJulkinen | null | undefined) {
  if (!projekti) return undefined;
  return projekti.velho.suunnittelustaVastaavaViranomainen === Viranomainen.VAYLAVIRASTO
    ? projekti.velho.asiatunnusVayla
    : projekti.velho.asiatunnusELY;
}
