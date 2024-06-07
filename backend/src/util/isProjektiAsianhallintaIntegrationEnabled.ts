import { Projekti, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { parameters } from "../aws/parameters";
import { DBProjekti } from "../database/model";

export async function isProjektiAsianhallintaIntegrationEnabled(
  projekti: Pick<DBProjekti | Projekti, "asianhallinta" | "velho">
): Promise<boolean> {
  return (await canProjektiAsianhallintaIntegrationBeEnabled(projekti)) && !projekti.asianhallinta?.inaktiivinen;
}

export async function canProjektiAsianhallintaIntegrationBeEnabled(projekti: Pick<DBProjekti | Projekti, "velho">): Promise<boolean> {
  if (projekti.velho?.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO) {
    return await parameters.isAsianhallintaIntegrationEnabled();
  } else {
    return await parameters.isUspaIntegrationEnabled();
  }
}
