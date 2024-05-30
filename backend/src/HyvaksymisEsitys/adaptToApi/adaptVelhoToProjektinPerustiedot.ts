import * as API from "hassu-common/graphql/apiModel";
import { vastaavanViranomaisenYTunnus } from "../../util/vastaavaViranomainen/yTunnus";
import { vastaavanViranomaisenAsiatunnus } from "../../util/vastaavaViranomainen/asiatunnus";
import { Velho } from "../../database/model";

export function adaptVelhoToProjektinPerustiedot(
  velho: Pick<Velho, "nimi" | "suunnittelustaVastaavaViranomainen" | "kunnat" | "asiatunnusELY" | "asiatunnusVayla">
): API.ProjektinPerustiedot {
  return {
    __typename: "ProjektinPerustiedot",
    suunnitelmanNimi: velho.nimi,
    asiatunnus: vastaavanViranomaisenAsiatunnus(velho),
    vastuuorganisaatio: velho.suunnittelustaVastaavaViranomainen,
    yTunnus: vastaavanViranomaisenYTunnus(velho.suunnittelustaVastaavaViranomainen),
    kunnat: velho.kunnat,
  };
}
