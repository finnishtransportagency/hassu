import * as API from "hassu-common/graphql/apiModel";
import { assertIsDefined } from "../../util/assertions";
import { vastaavanViranomaisenYTunnus } from "../../util/vastaavaViranomainen/yTunnus";
import { vastaavanViranomaisenAsiatunnus } from "../../util/vastaavaViranomainen/asiatunnus";
import { HyvaksymisEsityksenTiedot } from "../dynamoDBCalls/getHyvaksymisEsityksenTiedot";

export function haePerustiedot(projekti: HyvaksymisEsityksenTiedot): API.ProjektinPerustiedot {
  assertIsDefined(projekti.velho, "Projektilla pitää olla velho");
  return {
    __typename: "ProjektinPerustiedot",
    suunnitelmanNimi: projekti.velho.nimi,
    asiatunnus: vastaavanViranomaisenAsiatunnus(projekti.velho),
    vastuuorganisaatio: projekti.velho.suunnittelustaVastaavaViranomainen,
    yTunnus: vastaavanViranomaisenYTunnus(projekti.velho.suunnittelustaVastaavaViranomainen),
    kunnat: projekti.velho.kunnat,
  };
}
