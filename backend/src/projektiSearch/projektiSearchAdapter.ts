import { DBProjekti } from "../database/model/projekti";
import cloneDeep from "lodash/cloneDeep";

export function adaptProjektiToIndex(projekti: DBProjekti): any {
  const doc: Partial<DBProjekti> = cloneDeep(projekti);
  delete doc.kayttoOikeudet;
  delete doc.oid;
  delete doc.suunnitteluSopimus;
  delete doc.aloitusKuulutus;
  delete doc.lisakuulutuskieli;
  delete doc.euRahoitus;
  return doc;
}

export function adaptSearchResults(results: any): DBProjekti[] {
  if ((results.status && results.status >= 400) || !results.hits?.hits) {
    return [];
  }
  return results.hits.hits.map((hit: any) => {
    const projekti = hit._source as DBProjekti;
    projekti.oid = hit._id;
    return projekti;
  });
}
