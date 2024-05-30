import * as API from "hassu-common/graphql/apiModel";
import { Velho } from "../../database/model/common";

export const vastaavanViranomaisenAsiatunnus = (
  velho: Pick<Velho, "suunnittelustaVastaavaViranomainen" | "asiatunnusELY" | "asiatunnusVayla">
) =>
  velho.suunnittelustaVastaavaViranomainen === API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO
    ? velho.asiatunnusVayla
    : velho.asiatunnusELY;
