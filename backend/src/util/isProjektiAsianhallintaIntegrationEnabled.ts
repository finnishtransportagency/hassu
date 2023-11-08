import { Projekti } from "hassu-common/graphql/apiModel";
import { parameters } from "../aws/parameters";
import { DBProjekti } from "../database/model";

export async function isProjektiAsianhallintaIntegrationEnabled(projekti: DBProjekti | Projekti): Promise<boolean> {
  return (await canProjektiAsianhallintaIntegrationBeEnabled()) && !projekti.asianhallinta?.inaktiivinen;
}

export async function canProjektiAsianhallintaIntegrationBeEnabled(): Promise<boolean> {
  return await parameters.isAsianhallintaIntegrationEnabled();
}
