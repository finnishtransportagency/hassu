import { DBProjekti } from "../database/model/projekti";
import { deepClone } from "aws-cdk/lib/util";

export function adaptProjektiToIndex(projekti: DBProjekti): any {
  const doc: Partial<DBProjekti> = deepClone(projekti);
  delete doc.kayttoOikeudet;
  delete doc.oid;
  delete doc.suunnitteluSopimus;
  delete doc.aloitusKuulutus;
  delete doc.lisakuulutuskieli;
  delete doc.eurahoitus;
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
