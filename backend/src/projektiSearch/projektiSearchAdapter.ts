import { DBProjekti } from "../database/model/projekti";
import { deepClone } from "aws-cdk/lib/util";

export function adaptProjektiToIndex(projekti: DBProjekti): any {
  const doc: DBProjekti = deepClone(projekti);
  delete doc.kayttoOikeudet;
  delete doc.oid;
  delete doc.suunnitteluSopimus;
  delete doc.aloitusKuulutus;
  return doc;
}

export function adaptSearchResults(results: any): DBProjekti[] {
  return results.hits.hits.map((hit) => {
    const projekti = hit._source as DBProjekti;
    projekti.oid = hit._id;
    return projekti;
  });
}
