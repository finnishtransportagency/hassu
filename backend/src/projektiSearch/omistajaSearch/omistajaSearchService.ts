import {
  adaptOmistajaToIndex,
  adaptSearchResultsToProjektiDocuments,
  adaptSearchResultsToApiOmistaja,
} from "./kiinteistonomistajaSearchAdapter";
import { log, setLogContextOid } from "../../logger";
import { HaeKiinteistonOmistajatQueryVariables, KiinteistonOmistajat } from "hassu-common/graphql/apiModel";
import omistajaOpenSearchClient from "./omistajaOpenSearchClient";
import omistajaSettings from "./omistaja-settings.json";
import omistajaMapping from "./omistaja-mapping.json";
import { DBOmistaja } from "../../database/omistajaDatabase";

class OmistajaSearchService {
  async indexExists(): Promise<boolean> {
    return omistajaOpenSearchClient.indexExists();
  }

  async createIndex() {
    return omistajaOpenSearchClient.createIndex(omistajaSettings, omistajaMapping);
  }

  async deleteIndex() {
    return omistajaOpenSearchClient.deleteIndex();
  }

  async indexOmistaja(omistaja: DBOmistaja) {
    setLogContextOid(omistaja.oid);
    try {
      const omistajaToIndex = adaptOmistajaToIndex(omistaja);
      log.info("Index omistaja", { id: omistaja.id });
      await omistajaOpenSearchClient.putDocument(omistaja.id, omistajaToIndex);
    } catch (e) {
      log.error(e);
      log.error("OmistajaSearchService.indexProjekti failed.", { id: omistaja.id });
    }
  }

  async removeOmistaja(id: string) {
    await omistajaOpenSearchClient.deleteDocument(id);
  }

  async searchById(id: string[]): Promise<DBOmistaja[]> {
    const results = await omistajaOpenSearchClient.query({
      query: {
        terms: {
          _id: id,
        },
      },
      size: 10000,
    });
    const searchResults = adaptSearchResultsToProjektiDocuments(results);
    log.info(searchResults.length + " search results from OpenSearch");
    return searchResults;
  }

  async getOmistajaJaKiinteistotunnusMaarat(
    oid: string
  ): Promise<{ kiinteistotunnusMaara: number | undefined; omistajaMaara: number | undefined }> {
    const response = await omistajaOpenSearchClient.query({
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
      aggs: {
        unique_kiinteistotunnus: {
          cardinality: {
            field: "kiinteistotunnus.keyword",
          },
        },
      },
    });
    return { kiinteistotunnusMaara: response?.aggregations?.unique_kiinteistotunnus?.value, omistajaMaara: response?.hits?.total?.value };
  }

  async searchOmistajat(params: HaeKiinteistonOmistajatQueryVariables): Promise<KiinteistonOmistajat> {
    const searchResult = await omistajaOpenSearchClient.query({
      query: this.buildQuery(params),
      size: params.size ?? undefined,
      from: params.from ?? undefined,
      sort: [{ "kiinteistotunnus.keyword": { order: "asc" } }],
    });

    // Adaptoidaan hakutulos, ja samalla otetaan kiinni mahdollinen virhe.
    const searchResultDocuments = adaptSearchResultsToApiOmistaja(searchResult);
    const resultCount = searchResult.hits?.total?.value ?? 0;

    log.info(resultCount + " search results from OpenSearch");
    const result: KiinteistonOmistajat = {
      __typename: "KiinteistonOmistajat",
      omistajat: searchResultDocuments,
      hakutulosMaara: resultCount,
    };

    return result;
  }

  private buildQuery(params: HaeKiinteistonOmistajatQueryVariables): unknown {
    const query: any = {
      bool: {
        must: [
          {
            term: { oid: params.oid },
          },
          {
            term: { kaytossa: true },
          },
          {
            term: { suomifiLahetys: !params.muutOmistajat },
          },
        ],
      },
    };

    if (params.query) {
      query.bool.must.push({
        multi_match: {
          query: params.query,
          fields: ["nimi", "kiinteistotunnus", "jakeluosoite", "postinumero", "paikkakunta", "maa"],
          type: "cross_fields",
          operator: "and",
        },
      });
    }

    if (params.onlyUserCreated) {
      query.bool.must.push({
        term: { userCreated: true },
      });
    } else if (params.filterUserCreated) {
      query.bool.must.push({
        bool: {
          should: [
            {
              term: {
                userCreated: false,
              },
            },
            {
              bool: {
                must_not: {
                  exists: {
                    field: "userCreated",
                  },
                },
              },
            },
          ],
        },
      });
    }

    return query;
  }
}

export const omistajaSearchService = new OmistajaSearchService();
