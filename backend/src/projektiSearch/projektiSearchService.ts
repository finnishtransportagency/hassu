import { DBProjekti } from "../database/model";
import {
  adaptProjektiToIndex,
  adaptProjektiToJulkinenIndex,
  adaptSearchResultsToProjektiDocuments,
  adaptSearchResultsToProjektiHakutulosDokumenttis,
  ProjektiDocument,
} from "./projektiSearchAdapter";
import OpenSearchClient, { SortOrder } from "./openSearchClient";
import { log, setLogContextOid } from "../logger";
import {
  Kieli,
  ListaaProjektitInput,
  ProjektiHakutulos,
  ProjektiHakutulosJulkinen,
  ProjektiJulkinen,
  ProjektiSarake,
  ProjektiTyyppi,
  Status,
} from "hassu-common/graphql/apiModel";
import { getVaylaUser } from "../user";
import { projektiAdapterJulkinen } from "../projekti/adapter/projektiAdapterJulkinen";
import { ilmoitustauluSyoteService } from "../ilmoitustauluSyote/ilmoitustauluSyoteService";
import { isKieliTranslatable } from "hassu-common/kaannettavatKielet";
import openSearchClientYllapito from "./openSearchClientYllapito";
import { openSearchClientJulkinen } from "./openSearchClientJulkinen";

const projektiSarakeToField: Record<ProjektiSarake, string> = {
  ASIATUNNUS: "asiatunnus.keyword",
  NIMI: "nimi.keyword",
  PAIVITETTY: "paivitetty",
  PROJEKTIPAALLIKKO: "projektipaallikko.keyword",
  VAIHE: "vaihe.keyword",
  VASTUUORGANISAATIO: "suunnittelustaVastaavaViranomainen.keyword",
  VIIMEISIN_JULKAISU: "viimeisinJulkaisu",
};

class ProjektiSearchService {
  async indexProjekti(projekti: DBProjekti) {
    setLogContextOid(projekti.oid);
    try {
      const projektiToIndex = await adaptProjektiToIndex(projekti);
      log.info("Index projekti", { oid: projekti.oid });
      await openSearchClientYllapito.putDocument(projekti.oid, projektiToIndex);

      projekti.tallennettu = true;
      const apiProjekti = await projektiAdapterJulkinen.adaptProjekti(projekti);

      if (apiProjekti?.status && Object.keys(Status).indexOf(Status.ALOITUSKUULUTUS) <= Object.keys(Status).indexOf(apiProjekti.status)) {
        await this.addProjektiToJulkinenIndex(apiProjekti, projekti);
      } else {
        await this.removeProjektiFromJulkinenIndex(projekti);
      }
    } catch (e) {
      log.error(e);
      log.error("ProjektiSearchService.indexProjekti failed.", { oid: projekti.oid });
    }
  }

  private async removeProjektiFromJulkinenIndex(projekti: DBProjekti) {
    for (const kieli of Object.values(Kieli)) {
      if (isKieliTranslatable(kieli)) {
        log.info("Remove julkinen projekti from index", { oid: projekti.oid, kieli });
        await openSearchClientJulkinen[kieli].deleteDocument(projekti.oid);
      }
    }
    await ilmoitustauluSyoteService.remove(projekti.oid);
  }

  private async addProjektiToJulkinenIndex(apiProjekti: ProjektiJulkinen, projekti: DBProjekti) {
    for (const kieli of Object.values(Kieli)) {
      if (isKieliTranslatable(kieli)) {
        const projektiJulkinenToIndex = adaptProjektiToJulkinenIndex(apiProjekti, kieli);
        if (projektiJulkinenToIndex) {
          log.info("Index julkinen projekti", { oid: projekti.oid, kieli });
          await openSearchClientJulkinen[kieli].putDocument(projekti.oid, projektiJulkinenToIndex);
        }
      }
    }
    await ilmoitustauluSyoteService.index(apiProjekti);
  }

  async removeProjekti(oid: string) {
    await openSearchClientYllapito.deleteDocument(oid);
    for (const kieli of Object.values(Kieli)) {
      if (isKieliTranslatable(kieli)) {
        await openSearchClientJulkinen[kieli].deleteDocument(oid);
      }
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
    const pageSize = params.sivunKoko ?? 10;
    const pageNumber = params.sivunumero ?? 0;
    const queries: unknown[] = [];

    const projektiTyyppi: ProjektiTyyppi | null | undefined = params.projektiTyyppi;

    let projektiTyyppiQuery = undefined;
    if (projektiTyyppi) {
      projektiTyyppiQuery = { term: { "projektiTyyppi.keyword": projektiTyyppi } };
    } else {
      // Jos projektityyppi puuttuu, kyseessa on epaaktiiviset-valilehden kysely, jolloin otetaan mukaan kaikki projektityypit
      // ja rajoitetaan normaalisti muilla hakuehdoilla jos tarpeen
      projektiTyyppiQuery = { terms: { "projektiTyyppi.keyword": Object.values(ProjektiTyyppi) } };
    }

    if (params.vainProjektitMuokkausOikeuksin && !getVaylaUser()) {
      return {
        __typename: "ProjektiHakutulos",
        tulokset: [],
        hakutulosProjektiTyyppi: projektiTyyppi,
      };
    }
    // Lisää queries-arrayhyn paramsin mukaisia queryitä
    ProjektiSearchService.addCommonQueries(params, queries);
    // Lisää queries-arrayhyn paramsin mukaisia queryitä
    ProjektiSearchService.addYllapitoQueries(params, queries);
    const client: OpenSearchClient = openSearchClientYllapito;
    // Luodaan sort-array, jossa on paramsin mukaiset sorttausparametrit, mutta muokattuna haluttuun muotoon
    const sort = ProjektiSearchService.adaptSort(params.jarjestysSarake, params.jarjestysKasvava);

    // Tehdään varsinainen päähaku, jossa on mukana mahdollinen projektityyppirajaus.
    // Tehdääns asynkronisesti, ja laitetaan await vasta myöhemmin, jotta haut voi tehdä mahdollisimman rinnakkain.
    const searchResultPromise = client.query({
      query: ProjektiSearchService.buildQuery(queries, !!params.epaaktiivinen, projektiTyyppiQuery),
      size: pageSize,
      from: pageSize * pageNumber,
      sort,
    });

    // Tehdään erikseen aggregaatiohaku samoilla hakuehdoilla,
    // mutta rajoittamatta projektityyppiä ja aktiivisuutta
    // ja lasketaan, kuinka monta kunkin tyyppistä projektia on.
    const buckets = await client.query({
      query: ProjektiSearchService.buildQuery(queries, null), // <- null tarkoittaa, ettei aktiivisuutta rajoiteta
      aggs: {
        aktiivinen: {
          terms: {
            field: "aktiivinen",
            size: 10,
          },
          aggs: {
            projektiTyyppi: {
              terms: {
                field: "projektiTyyppi.keyword",
                size: 10,
              },
            },
          },
        },
      },
    });

    // Vastauksen muoto:
    // {
    //   "aggregations": {
    //     "aktiivinen": {
    //         "buckets": [
    //             {
    //                 "key": 0,
    //                 "doc_count": 1,
    //                 "projektiTyyppi": {
    //                     "buckets": [
    //                         {
    //                             "key": "TIE",
    //                             "doc_count": 1
    //                         }
    //                     ]
    //                 }
    //             },
    //             {
    //                 "key": 1,
    //                 "doc_count": 1,
    //                 "projektiTyyppi": {
    //                     "buckets": [
    //                         {
    //                             "key": "TIE",
    //                             "doc_count": 1
    //                         }
    //                     ]
    //                 }
    //             }
    //         ]
    //     }
    // },

    const searchResult = await searchResultPromise;

    // Adaptoidaan hakutulos, ja samalla otetaan kiinni mahdollinen virhe.
    const searchResultDocuments = adaptSearchResultsToProjektiHakutulosDokumenttis(searchResult);
    const resultCount = searchResult.hits.total.value;

    log.info(resultCount + " " + projektiTyyppi + " search results from OpenSearch");
    const result: ProjektiHakutulos = {
      __typename: "ProjektiHakutulos",
      tulokset: searchResultDocuments,
      hakutulosProjektiTyyppi: projektiTyyppi,
    };

    // Lisätään hakutulokseen tieto, kuinka munta osumaa on missäkin projektityyppikategoriassa
    buckets.aggregations.aktiivinen.buckets.forEach((bucket: any) => {
      if (bucket.key == 0) {
        result.epaaktiivisetMaara = bucket.doc_count;
      } else {
        bucket.projektiTyyppi.buckets.forEach((bucket: any) => {
          if (bucket.key == ProjektiTyyppi.TIE) {
            result.tiesuunnitelmatMaara = bucket.doc_count;
          } else if (bucket.key == ProjektiTyyppi.RATA) {
            result.ratasuunnitelmatMaara = bucket.doc_count;
          } else if (bucket.key == ProjektiTyyppi.YLEINEN) {
            result.yleissuunnitelmatMaara = bucket.doc_count;
          }
        });
      }
    });
    return result;
  }

  async searchJulkinen(params: ListaaProjektitInput): Promise<ProjektiHakutulosJulkinen> {
    const pageSize = params.sivunKoko ?? 10;
    const pageNumber = params.sivunumero ?? 0;
    const queries: unknown[] = [];

    // Return only public ones
    queries.push({
      range: {
        publishTimestamp: {
          lte: "now",
        },
      },
    });

    const projektiTyyppi: ProjektiTyyppi | null | undefined = params.projektiTyyppi;
    if (projektiTyyppi) {
      queries.push({ term: { "projektiTyyppi.keyword": projektiTyyppi } });
    }

    ProjektiSearchService.addCommonQueries(params, queries);

    if (!isKieliTranslatable(params.kieli)) {
      throw new Error("Kieli on pakollinen parametri julkisiin hakuihin, ja vain SUOMI ja RUOTSI hyväksytään!");
    }
    const client: OpenSearchClient = openSearchClientJulkinen[params.kieli];
    const resultsPromise = client.query({
      query: ProjektiSearchService.buildQuery(queries, null), //<- null, koska ei oteta kantaa aktiivisuuteen, koska kaikki julkisen indeksin projektit ovat aktiivisia
      size: pageSize,
      from: pageSize * pageNumber,
      sort: ProjektiSearchService.adaptSort(ProjektiSarake.VIIMEISIN_JULKAISU, false),
    });

    const searchResult = await resultsPromise;
    if (!searchResult?.hits?.total) {
      log.error(searchResult);
    }
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
      queries.push({ match_bool_prefix: { asiatunnus: params.asiatunnus } });
    }
    if (params.suunnittelustaVastaavaViranomainen) {
      queries.push({
        terms: { "suunnittelustaVastaavaViranomainen.keyword": params.suunnittelustaVastaavaViranomainen },
      });
    }
    if (params.vainProjektitMuokkausOikeuksin) {
      const user = getVaylaUser();
      if (!user) {
        throw new Error("addYllapitoQueries: unable to get user");
      }
      queries.push({ term: { "muokkaajat.keyword": user.uid } });
    }
  }

  private static addCommonQueries(params: ListaaProjektitInput, queries: unknown[]) {
    if (params.nimi) {
      const words = params.nimi.match(/\S+\s*/g) ?? [params.nimi];
      queries.push({
        bool: {
          must: words.map((word) => ({
            prefix: {
              nimi: this.keepAlphanumeric(word),
            },
          })),
        },
      });
    }
    if (params.maakunta) {
      queries.push({
        terms: { maakunnat: params.maakunta },
      });
    }
    if (params.kunta) {
      queries.push({
        terms: { kunnat: params.kunta },
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
      const eiEpaaktiivisiaTiloja = vaiheParam.filter(
        (tila) => ![Status.EPAAKTIIVINEN_1, Status.EPAAKTIIVINEN_2, Status.EPAAKTIIVINEN_3].includes(tila)
      );
      if (eiEpaaktiivisiaTiloja.length > 0) {
        queries.push({ terms: { "vaihe.keyword": vaiheParam } });
      }
    }
  }

  private static buildQuery(queries: unknown[], epaaktiiviset: boolean | undefined | null, projektiTyyppiQuery?: unknown) {
    const allQueries = projektiTyyppiQuery ? queries.concat(projektiTyyppiQuery) : queries;
    if (epaaktiiviset === false) {
      allQueries.push({
        term: {
          aktiivinen: true,
        },
      });
    }
    const obj: any = { bool: {} };

    if (allQueries.length > 0) {
      obj.bool.must = allQueries;
    }
    if (epaaktiiviset === true) {
      allQueries.push({
        term: {
          aktiivinen: false,
        },
      });
    }
    return obj;
  }

  public static adaptSort(
    jarjestysSarake?: ProjektiSarake | null,
    jarjestysKasvava?: boolean | null
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

  private static keepAlphanumeric(input: string): string {
    return input.replace(/[^a-zA-Z0-9åäöÅÄÖ]/g, "").toLocaleLowerCase();
  }
}

export const projektiSearchService = new ProjektiSearchService();
