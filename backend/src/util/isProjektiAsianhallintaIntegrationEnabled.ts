import { SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { parameters } from "../aws/parameters";
import { DBProjekti } from "../database/model";

export async function isProjektiAsianhallintaIntegrationEnabled(projekti: DBProjekti): Promise<boolean> {
  return (await canProjektiAsianhallintaIntegrationBeEnabled(projekti)) && !projekti.asianhallinta?.inaktiivinen;
}

export async function canProjektiAsianhallintaIntegrationBeEnabled(projekti: DBProjekti): Promise<boolean> {
  return (
    (await parameters.isAsianhallintaIntegrationEnabled()) &&
    // TODO Poista alla oleva ehto kun USPA-integraatiototeutus on valmis
    projekti.velho?.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO
  );
}
