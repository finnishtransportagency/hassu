import { Projekti, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { parameters } from "../aws/parameters";
import { DBProjekti } from "../database/model";

export async function isProjektiAsianhallintaIntegrationEnabled(projekti: DBProjekti | Projekti): Promise<boolean> {
  return (await canProjektiAsianhallintaIntegrationBeEnabled(projekti)) && !projekti.asianhallinta?.inaktiivinen;
}

export async function canProjektiAsianhallintaIntegrationBeEnabled(projekti: DBProjekti | Projekti): Promise<boolean> {
  if (projekti.velho?.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO) {
    return await parameters.isAsianhallintaIntegrationEnabled();
  } else {
    return await parameters.isUspaIntegrationEnabled();
  }
}
