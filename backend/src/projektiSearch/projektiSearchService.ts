import { DBProjekti } from "../database/model/projekti";
import { adaptProjektiToIndex, adaptSearchResults } from "./projektiSearchAdapter";
import { openSearchClient } from "./openSearchClient";
import log from "loglevel";

type SearchParams = {
  oid?: string[];
};

class ProjektiSearchService {
  async indexProjekti(projekti: DBProjekti) {
    await openSearchClient.putProjekti(projekti.oid, adaptProjektiToIndex(projekti));
  }

  async removeProjekti(oid: string) {
    await openSearchClient.deleteProjekti(oid);
  }

  async search(params: SearchParams): Promise<DBProjekti[]> {
    let query: any;
    if (params.oid) {
      query = {
        terms: {
          _id: params.oid,
        },
      };
    } else {
      throw new Error("Error in params: specify only one criteria at the time");
    }
    const searchResults = adaptSearchResults(await openSearchClient.query(query));
    log.info(searchResults.length + " search results from OpenSearch");
    return searchResults;
  }
}

export const projektiSearchService = new ProjektiSearchService();
