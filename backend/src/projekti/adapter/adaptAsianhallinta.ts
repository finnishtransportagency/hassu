import { DBProjekti } from "../../database/model";
import { Asianhallinta } from "hassu-common/graphql/apiModel";
import {
  canProjektiAsianhallintaIntegrationBeEnabled,
  isProjektiAsianhallintaIntegrationEnabled,
} from "../../util/isProjektiAsianhallintaIntegrationEnabled";

export async function adaptAsianhallinta(projekti: Pick<DBProjekti, "asianhallinta" | "velho">): Promise<Asianhallinta> {
  return {
    __typename: "Asianhallinta",
    aktivoitavissa: await canProjektiAsianhallintaIntegrationBeEnabled(projekti),
    inaktiivinen: !(await isProjektiAsianhallintaIntegrationEnabled(projekti)),
  };
}
