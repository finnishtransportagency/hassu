import { DBProjekti } from "../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import {
  canProjektiAsianhallintaIntegrationBeEnabled,
  isProjektiAsianhallintaIntegrationEnabled,
} from "../../util/isProjektiAsianhallintaIntegrationEnabled";
import { getLinkkiAsianhallintaan } from "../../asianhallinta/getLinkkiAsianhallintaan";

export async function adaptAsianhallintaToAPI(dbProjekti: Pick<DBProjekti, "velho">): Promise<API.AsianhallintaNew> {
  return {
    __typename: "AsianhallintaNew",
    aktivoitavissa: await canProjektiAsianhallintaIntegrationBeEnabled(dbProjekti),
    inaktiivinen: !(await isProjektiAsianhallintaIntegrationEnabled(dbProjekti)),
    linkkiAsianhallintaan: await getLinkkiAsianhallintaan(dbProjekti),
  };
}
