import { DBProjekti } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { parameters } from "../../aws/parameters";

export async function adaptAsianhallinta(projekti: DBProjekti): Promise<API.Asianhallinta> {
  const aktivoitavissa = await parameters.isAsianhallintaIntegrationEnabled();
  return {
    __typename: "Asianhallinta",
    aktivoitavissa,
    inaktiivinen: !aktivoitavissa || !!projekti.asianhallinta?.inaktiivinen,
  };
}
