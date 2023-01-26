import { Velho, VelhoJulkinen, Viranomainen } from "../../common/graphql/apiModel";

export default function getAsiatunnus(
  projekti:
    | { velho: Pick<Velho | VelhoJulkinen, "asiatunnusVayla" | "asiatunnusELY" | "suunnittelustaVastaavaViranomainen"> }
    | null
    | undefined
) {
  if (!projekti || !projekti.velho) {
    return undefined;
  }
  return projekti.velho.suunnittelustaVastaavaViranomainen === Viranomainen.VAYLAVIRASTO
    ? projekti.velho.asiatunnusVayla
    : projekti.velho.asiatunnusELY;
}
