import { DBProjekti } from "../../database/model";
import { parameters } from "../../aws/parameters";
import { Asianhallinta, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";

export async function adaptAsianhallinta(projekti: DBProjekti): Promise<Asianhallinta> {
  const aktivoitavissa =
    (await parameters.isAsianhallintaIntegrationEnabled()) &&
    // TODO Poista alla oleva ehto kun USPA-integraatiototeutus on valmis
    projekti.velho?.suunnittelustaVastaavaViranomainen === SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO;
  return {
    __typename: "Asianhallinta",
    aktivoitavissa,
    inaktiivinen: !aktivoitavissa || !!projekti.asianhallinta?.inaktiivinen,
  };
}
