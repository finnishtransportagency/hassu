import {
  adaptMuistuttajaToIndex,
  adaptSearchResultsToMuistuttajaDocuments,
  adaptSearchResultsToApiMuistuttaja,
} from "./muistuttajaSearchAdapter";
import { log, setLogContextOid } from "../../logger";
import { HaeMuistuttajatQueryVariables, Muistuttajat } from "hassu-common/graphql/apiModel";
import muistuttajaOpenSearchClient from "./muistuttajaOpenSearchClient";
import muistuttajaSettings from "./muistuttaja-settings.json";
import muistuttajaMapping from "./muistuttaja-mapping.json";
import { DBMuistuttaja } from "../../database/muistuttajaDatabase";

class MuistuttajaSearchService {
  async indexExists(): Promise<boolean> {
    return muistuttajaOpenSearchClient.indexExists();
  }

  async createIndex() {
    return muistuttajaOpenSearchClient.createIndex(muistuttajaSettings, muistuttajaMapping);
  }

  async deleteIndex() {
    return muistuttajaOpenSearchClient.deleteIndex();
  }

  async indexMuistuttaja(muistuttaja: DBMuistuttaja) {
    setLogContextOid(muistuttaja.oid);
    try {
      const muistuttajaToIndex = adaptMuistuttajaToIndex(muistuttaja);
      log.info("Index muistuttaja", { id: muistuttaja.id });
      await muistuttajaOpenSearchClient.putDocument(muistuttaja.id, muistuttajaToIndex);
    } catch (e) {
      log.error(e);
      log.error("MuistuttajaSearchService.indexProjekti failed.", { id: muistuttaja.id });
    }
  }

  async removeMuistuttaja(id: string) {
    await muistuttajaOpenSearchClient.deleteDocument(id);
  }

  async searchById(id: string[]): Promise<DBMuistuttaja[]> {
    const results = await muistuttajaOpenSearchClient.query({
      query: {
        terms: {
          _id: id,
        },
      },
      size: 10000,
    });
    const searchResults = adaptSearchResultsToMuistuttajaDocuments(results);
    log.info(searchResults.length + " search results from OpenSearch");
    return searchResults;
  }

  async getMuistuttajaMaara(oid: string): Promise<number> {
    const response = await muistuttajaOpenSearchClient.query({
      query: {
        bool: {
          must: [
            {
              term: { oid },
            },
            {
              term: { kaytossa: true },
            },
          ],
        },
      },
    });
    return response?.hits?.total?.value;
  }

  async searchMuistuttajat(params: HaeMuistuttajatQueryVariables): Promise<Muistuttajat> {
    const searchResult = await muistuttajaOpenSearchClient.query({
      query: this.buildQuery(params),
      size: params.size ?? undefined,
      from: params.from ?? undefined,
      sort: [{ "sukunimi.keyword": { order: "asc" } }],
    });

    // Adaptoidaan hakutulos, ja samalla otetaan kiinni mahdollinen virhe.
    const searchResultDocuments = adaptSearchResultsToApiMuistuttaja(searchResult);
    const resultCount = searchResult.hits?.total?.value ?? 0;

    log.info(resultCount + " search results from OpenSearch");
    const result: Muistuttajat = {
      __typename: "Muistuttajat",
      muistuttajat: searchResultDocuments,
      hakutulosMaara: resultCount,
    };

    return result;
  }

  private buildQuery(params: HaeMuistuttajatQueryVariables): unknown {
    const query: any = {
      bool: {
        must: [
          {
            term: { oid: params.oid },
          },
          {
            term: { suomifiLahetys: !params.muutMuistuttajat },
          },
          {
            term: { kaytossa: true },
          },
        ],
      },
    };

    if (params.query) {
      query.bool.must.push({
        multi_match: {
          query: params.query,
          fields: ["lahiosoite", "nimi", "postinumero", "postitoimipaikka", "tiedotusosoite", "maa"],
          type: "cross_fields",
          operator: "and",
        },
      });
    }

    return query;
  }
}

export const muistuttajaSearchService = new MuistuttajaSearchService();
