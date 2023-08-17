import { DBProjekti } from "../../backend/src/database/model";
import { Projekti } from "../graphql/apiModel";

export function isProjektiDBProjekti(projekti: DBProjekti | Projekti): projekti is DBProjekti {
  return !!(projekti as DBProjekti).aloitusKuulutusJulkaisut; // Does not actually tell if projekti is DBProjekti, but is enough for our use case
}
export function isProjektiAPIProjekti(projekti: DBProjekti | Projekti): projekti is Projekti {
  return !!(projekti as Projekti).aloitusKuulutusJulkaisu; // Does not actually tell if projekti is Projekti, but is enough for our use case
}
