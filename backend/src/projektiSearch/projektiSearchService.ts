import { DBProjekti } from "../database/model/projekti";
import {
  adaptProjektiToIndex,
  adaptSearchResultsToProjektiDocuments,
  adaptSearchResultsToProjektiHakutulosDokumenttis,
  ProjektiDocument,
} from "./projektiSearchAdapter";
import { openSearchClient, SortOrder } from "./openSearchClient";
import { log } from "../logger";
import {
  ListaaProjektitInput,
  ProjektiHakutulos,
  ProjektiSarake,
  ProjektiTyyppi,
  Status,
} from "../../../common/graphql/apiModel";
import { getVaylaUser } from "../user";

const projektiSarakeToField: Record<ProjektiSarake, string> = {
  ASIATUNNUS: "asiatunnus.keyword",
  NIMI: "nimi.keyword",
  PAIVITETTY: "paivitetty",
  PROJEKTIPAALLIKKO: "projektipaallikko.keyword",
  VAIHE: "vaihe.keyword",
  VASTUUORGANISAATIO: "suunnittelustaVastaavaViranomainen.keyword",
};

class ProjektiSearchService {
  async indexProjekti(projekti: DBProjekti) {
    const projektiToIndex = adaptProjektiToIndex(projekti);
    log.info("Index projekti", { projektiToIndex });
    return openSearchClient.putProjekti(projekti.oid, projektiToIndex);
  }

  async removeProjekti(oid: string) {
    await openSearchClient.deleteProjekti(oid);
  }

  async searchByOid(oid: string[]): Promise<ProjektiDocument[]> {
    const results = await openSearchClient.query({
      query: {
        terms: {
          _id: oid,
        },
      },
      size: 10000,
    });
    const searchResults = adaptSearchResultsToProjektiDocuments(results);
    log.info(searchResults.length + " search results from OpenSearch");
    return searchResults;
  }

  async search(params: ListaaProjektitInput): Promise<ProjektiHakutulos> {
    const pageSize = params.sivunKoko || 10;
    const pageNumber = params.sivunumero || 0;

    const projektiTyyppi = params.projektiTyyppi || ProjektiTyyppi.TIE;
    const queries: unknown[] = [];

    if (params.nimi) {
      queries.push({
        bool: {
          minimum_should_match: 1,
          should: [
            {
              match_bool_prefix: {
                nimi: params.nimi,
              },
            },
            {
              match: {
                nimi: {
                  query: params.nimi,
                  fuzziness: "AUTO",
                  minimum_should_match: -1,
                },
              },
            },
          ],
        },
      });
    }
    if (params.asiatunnus) {
      queries.push({ term: { "asiatunnus.keyword": params.asiatunnus } });
    }
    if (params.maakunta) {
      queries.push({
        terms: { "maakunnat.keyword": params.maakunta },
      });
    }
    if (params.vaylamuoto) {
      queries.push({
        terms: { "vaylamuoto.keyword": params.vaylamuoto },
      });
    }
    if (params.suunnittelustaVastaavaViranomainen) {
      queries.push({
        terms: { "suunnittelustaVastaavaViranomainen.keyword": params.suunnittelustaVastaavaViranomainen },
      });
    }
    if (params.vaihe) {
      const vaiheParam = params.vaihe;
      if (vaiheParam.indexOf(Status.EI_JULKAISTU) >= 0) {
        vaiheParam.push(Status.EI_JULKAISTU_PROJEKTIN_HENKILOT);
      }
      queries.push({ terms: { "vaihe.keyword": vaiheParam } });
    }

    if (params.vainProjektitMuokkausOikeuksin) {
      const user = getVaylaUser();
      if (!user) {
        return {
          __typename: "ProjektiHakutulos",
          tulokset: [],
          hakutulosProjektiTyyppi: projektiTyyppi,
        };
      }
      queries.push({ term: { "muokkaajat.keyword": user.uid } });
    }
    const resultsPromise = openSearchClient.query({
      query: ProjektiSearchService.buildQuery(queries, { term: { "projektiTyyppi.keyword": projektiTyyppi } }),
      size: pageSize,
      from: pageSize * pageNumber,
      sort: ProjektiSearchService.adaptSort(params.jarjestysSarake, params.jarjestysKasvava),
    });

    const buckets = await openSearchClient.query({
      query: ProjektiSearchService.buildQuery(queries),
      aggs: {
        projektiTyypit: {
          terms: {
            field: "projektiTyyppi.keyword",
            size: 10,
          },
        },
      },
      size: 0,
    });

    const searchResults = adaptSearchResultsToProjektiHakutulosDokumenttis(await resultsPromise);

    const result: ProjektiHakutulos = {
      __typename: "ProjektiHakutulos",
      tulokset: searchResults,
      hakutulosProjektiTyyppi: projektiTyyppi,
    };

    log.info(searchResults.length + " " + projektiTyyppi + " search results from OpenSearch");
    buckets.aggregations.projektiTyypit.buckets.forEach((bucket) => {
      if (bucket.key == ProjektiTyyppi.TIE) {
        result.tiesuunnitelmatMaara = bucket.doc_count;
      } else if (bucket.key == ProjektiTyyppi.RATA) {
        result.ratasuunnitelmatMaara = bucket.doc_count;
      } else if (bucket.key == ProjektiTyyppi.YLEINEN) {
        result.yleissuunnitelmatMaara = bucket.doc_count;
      }
    });
    return result;
  }

  private static buildQuery(queries: unknown[], query?: unknown) {
    const allQueries = query ? queries.concat(query) : queries;
    if (allQueries.length > 0) {
      return {
        bool: { must: allQueries },
      };
    } else {
      return {
        match_all: {},
      };
    }
  }

  public static adaptSort(
    jarjestysSarake?: ProjektiSarake,
    jarjestysKasvava?: boolean
  ): Partial<Record<keyof ProjektiDocument, SortOrder>>[] {
    const sort: Partial<Record<string, SortOrder>>[] = jarjestysSarake
      ? [{ [projektiSarakeToField[jarjestysSarake]]: { order: jarjestysKasvava ? "asc" : "desc" } }]
      : [{ paivitetty: { order: "desc" } }];
    // Secondarily sort by name
    if (jarjestysSarake != ProjektiSarake.NIMI) {
      sort.push({ "nimi.keyword": { order: "asc" } });
    }
    return sort;
  }
}

export const projektiSearchService = new ProjektiSearchService();
