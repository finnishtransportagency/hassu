import * as API from "hassu-common/graphql/apiModel";
import { DBMuistuttaja } from "../../database/muistuttajaDatabase";
import { log } from "../../logger";

export type MuistuttajaDocument = Pick<
  DBMuistuttaja,
  | "etunimi"
  | "sukunimi"
  | "lahiosoite"
  | "nimi"
  | "postinumero"
  | "postitoimipaikka"
  | "lisatty"
  | "tiedotustapa"
  | "oid"
  | "tiedotusosoite"
  | "paivitetty"
  | "suomifiLahetys"
>;

export function adaptMuistuttajaToIndex({
  etunimi,
  lahiosoite,
  nimi,
  postinumero,
  postitoimipaikka,
  sukunimi,
  lisatty,
  tiedotustapa,
  oid,
  paivitetty,
  tiedotusosoite,
  suomifiLahetys,
}: DBMuistuttaja): MuistuttajaDocument {
  return {
    etunimi,
    lahiosoite,
    nimi,
    postinumero,
    postitoimipaikka,
    sukunimi,
    lisatty,
    tiedotustapa,
    oid,
    paivitetty,
    tiedotusosoite,
    suomifiLahetys,
  };
}

export function adaptSearchResultsToMuistuttajaDocuments(results: any): DBMuistuttaja[] {
  if ((results.status && results.status >= 400) || !results.hits?.hits) {
    return [];
  }
  return results.hits.hits.map((hit: any) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return { ...hit._source, oid: hit._id } as DBMuistuttaja;
  });
}

export function adaptSearchResultsToApiMuistuttaja(results: any): API.Muistuttaja[] {
  // jos indeksiä ei löydy tulee 404 virhe, käsitellään se samoin kuin ei löytyisi mitään
  if (results.status && results.status >= 400 && results.status !== 404) {
    log.error(results);
    throw new Error("Muistuttajahaussa tapahtui virhe");
  }
  return results.hits?.hits?.map(mapHitToApiMuistuttaja) ?? [];
}

export type MuistuttajaDocumentHit = {
  _id: DBMuistuttaja["id"];
  _source: MuistuttajaDocument;
};

function mapHitToApiMuistuttaja(hit: MuistuttajaDocumentHit) {
  const dokumentti: API.Muistuttaja = {
    __typename: "Muistuttaja",
    id: hit._id,
    etunimi: hit._source.etunimi,
    sukunimi: hit._source.sukunimi,
    jakeluosoite: hit._source.lahiosoite,
    nimi: hit._source.nimi,
    postinumero: hit._source.postinumero,
    paikkakunta: hit._source.postitoimipaikka,
    lisatty: hit._source.lisatty,
    tiedotustapa: hit._source.tiedotustapa,
    paivitetty: hit._source.paivitetty,
    tiedotusosoite: hit._source.tiedotusosoite,
  };
  return dokumentti;
}
