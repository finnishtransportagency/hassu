import { DBProjekti } from "../database/model";
import {
  adaptProjektiToIndex,
  adaptProjektiToJulkinenIndex,
  adaptSearchResultsToProjektiDocuments,
  adaptSearchResultsToProjektiHakutulosDokumenttis,
  ProjektiDocument,
} from "./projektiSearchAdapter";
import { OpenSearchClient, openSearchClientJulkinen, openSearchClientYllapito, SortOrder } from "./openSearchClient";
import { log } from "../logger";
import {
  Kieli,
  ListaaProjektitInput,
  ProjektiHakutulos,
  ProjektiHakutulosJulkinen,
  ProjektiSarake,
  ProjektiTyyppi,
  Status,
} from "../../../common/graphql/apiModel";
import { getVaylaUser } from "../user";
import { projektiAdapterJulkinen } from "../projekti/adapter/projektiAdapterJulkinen";
import { ilmoitustauluSyoteService } from "../ilmoitustauluSyote/ilmoitustauluSyoteService";

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
    log.info("Index projekti", { oid: projekti.oid });
    await openSearchClientYllapito.putDocument(projekti.oid, projektiToIndex);

    projekti.tallennettu = true;
    const apiProjekti = projektiAdapterJulkinen.adaptProjekti(projekti);
    if (apiProjekti) {
      for (const kieli of Object.values(Kieli)) {
        const projektiJulkinenToIndex = adaptProjektiToJulkinenIndex(apiProjekti, kieli);
        if (projektiJulkinenToIndex) {
          log.info("Index julkinen projekti", { oid: projekti.oid, kieli });
          await openSearchClientJulkinen[kieli].putDocument(projekti.oid, projektiJulkinenToIndex);
        }
      }
      await ilmoitustauluSyoteService.index(apiProjekti);
    }
  }

  async removeProjekti(oid: string) {
    await openSearchClientYllapito.deleteDocument(oid);
    for (const kieli of Object.values(Kieli)) {
      await openSearchClientJulkinen[kieli].deleteDocument(oid);
    }
    await ilmoitustauluSyoteService.remove(oid);
  }

  async searchByOid(oid: string[]): Promise<ProjektiDocument[]> {
    const results = await openSearchClientYllapito.query({
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

  async searchYllapito(params: ListaaProjektitInput): Promise<ProjektiHakutulos> {
    const pageSize = params.sivunKoko || 10;
    const pageNumber = params.sivunumero || 0;
    const queries: unknown[] = [];

    let projektiTyyppi: ProjektiTyyppi = params.projektiTyyppi;
    if (!projektiTyyppi) {
      // Default projektiTyyppi for yllapito search
      projektiTyyppi = ProjektiTyyppi.TIE;
    }
    let projektiTyyppiQuery = undefined;
    if (projektiTyyppi) {
      projektiTyyppiQuery = { term: { "projektiTyyppi.keyword": projektiTyyppi } };
    }

    if (params.vainProjektitMuokkausOikeuksin && !getVaylaUser()) {
      return {
        __typename: "ProjektiHakutulos",
        tulokset: [],
        hakutulosProjektiTyyppi: projektiTyyppi,
      };
    }
    ProjektiSearchService.addCommonQueries(params, queries);

    ProjektiSearchService.addYllapitoQueries(params, queries);
    const client: OpenSearchClient = openSearchClientYllapito;
    const sort = ProjektiSearchService.adaptSort(params.jarjestysSarake, params.jarjestysKasvava);
    const resultsPromise = client.query({
      query: ProjektiSearchService.buildQuery(queries, projektiTyyppiQuery),
      size: pageSize,
      from: pageSize * pageNumber,
      sort,
    });

    const buckets = await client.query({
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

    const searchResult = await resultsPromise;
    const searchResultDocuments = adaptSearchResultsToProjektiHakutulosDokumenttis(searchResult);
    const resultCount = searchResult.hits.total.value;

    log.info(resultCount + " " + projektiTyyppi + " search results from OpenSearch");
    const result: ProjektiHakutulos = {
      __typename: "ProjektiHakutulos",
      tulokset: searchResultDocuments,
      hakutulosProjektiTyyppi: projektiTyyppi,
    };

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

  async searchJulkinen(params: ListaaProjektitInput): Promise<ProjektiHakutulosJulkinen> {
    const pageSize = params.sivunKoko || 10;
    const pageNumber = params.sivunumero || 0;
    const queries: unknown[] = [];

    // Return only public ones
    queries.push({
      range: {
        publishTimestamp: {
          lte: "now",
        },
      },
    });

    const projektiTyyppi: ProjektiTyyppi = params.projektiTyyppi;
    if (projektiTyyppi) {
      queries.push({ term: { "projektiTyyppi.keyword": projektiTyyppi } });
    }

    ProjektiSearchService.addCommonQueries(params, queries);

    if (!params.kieli) {
      throw new Error("Kieli on pakollinen parametri julkisiin hakuihin");
    }
    const client: OpenSearchClient = openSearchClientJulkinen[params.kieli];
    const resultsPromise = client.query({
      query: ProjektiSearchService.buildQuery(queries),
      size: pageSize,
      from: pageSize * pageNumber,
      sort: ProjektiSearchService.adaptSort(ProjektiSarake.PAIVITETTY, false),
    });

    const searchResult = await resultsPromise;
    const searchResultDocuments = adaptSearchResultsToProjektiHakutulosDokumenttis(searchResult);

    const resultCount = searchResult.hits.total.value;
    log.info(resultCount + " search results from OpenSearch");
    return {
      __typename: "ProjektiHakutulosJulkinen",
      tulokset: searchResultDocuments,
      hakutulosMaara: resultCount,
    };
  }

  private static addYllapitoQueries(params: ListaaProjektitInput, queries: unknown[]) {
    if (params.asiatunnus) {
      queries.push({ term: { "asiatunnus.keyword": params.asiatunnus } });
    }
    if (params.suunnittelustaVastaavaViranomainen) {
      queries.push({
        terms: { "suunnittelustaVastaavaViranomainen.keyword": params.suunnittelustaVastaavaViranomainen },
      });
    }
    if (params.vainProjektitMuokkausOikeuksin) {
      const user = getVaylaUser();
      queries.push({ term: { "muokkaajat.keyword": user.uid } });
    }
  }

  private static addCommonQueries(params: ListaaProjektitInput, queries: unknown[]) {
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
    if (params.maakunta) {
      queries.push({
        terms: { "maakunnat.keyword": params.maakunta },
      });
    }
    if (params.kunta) {
      queries.push({
        terms: { "kunnat.keyword": params.kunta },
      });
    }
    if (params.vaylamuoto) {
      queries.push({
        terms: { "vaylamuoto.keyword": params.vaylamuoto },
      });
    }
    if (params.vaihe) {
      const vaiheParam = params.vaihe;
      if (vaiheParam.indexOf(Status.EI_JULKAISTU) >= 0) {
        vaiheParam.push(Status.EI_JULKAISTU_PROJEKTIN_HENKILOT);
      }
      queries.push({ terms: { "vaihe.keyword": vaiheParam } });
    }
  }

  private static buildQuery(queries: unknown[], projektiTyyppiQuery?: unknown) {
    const allQueries = projektiTyyppiQuery ? queries.concat(projektiTyyppiQuery) : queries;
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
