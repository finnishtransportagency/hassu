import * as API from "hassu-common/graphql/apiModel";
import { DBOmistaja } from "../../database/omistajaDatabase";
import { log } from "../../logger";

export type OmistajaDocument = Pick<
  DBOmistaja,
  | "etunimet"
  | "jakeluosoite"
  | "kiinteistotunnus"
  | "nimi"
  | "oid"
  | "paikkakunta"
  | "postinumero"
  | "sukunimi"
  | "lisatty"
  | "paivitetty"
  | "suomifiLahetys"
  | "kaytossa"
>;

export function adaptOmistajaToIndex({
  etunimet,
  jakeluosoite,
  kiinteistotunnus,
  oid,
  nimi,
  paikkakunta,
  postinumero,
  sukunimi,
  lisatty,
  paivitetty,
  suomifiLahetys,
  kaytossa,
}: DBOmistaja): OmistajaDocument {
  return {
    etunimet,
    jakeluosoite,
    kiinteistotunnus,
    oid,
    nimi,
    paikkakunta,
    postinumero,
    sukunimi,
    lisatty,
    paivitetty,
    suomifiLahetys,
    kaytossa,
  };
}

export function adaptSearchResultsToProjektiDocuments(results: any): DBOmistaja[] {
  if ((results.status && results.status >= 400) || !results.hits?.hits) {
    return [];
  }
  return results.hits.hits.map((hit: any) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return { ...hit._source, oid: hit._id } as DBOmistaja;
  });
}

export function adaptSearchResultsToApiOmistaja(results: any): API.Omistaja[] {
  // jos indeksiä ei löydy tulee 404 virhe, käsitellään se samoin kuin ei löytyisi mitään
  if (results.status && results.status >= 400 && results.status !== 404) {
    log.error(results);
    throw new Error("Omistajahaussa tapahtui virhe");
  }
  return results.hits?.hits?.map(mapHitToApiOmistaja) ?? [];
}

export type OmistajaDocumentHit = {
  _id: DBOmistaja["id"];
  _source: Omit<DBOmistaja, "id">;
};

function mapHitToApiOmistaja(hit: OmistajaDocumentHit) {
  const { kiinteistotunnus, lisatty, oid, etunimet, jakeluosoite, nimi, paikkakunta, paivitetty, postinumero, sukunimi } = hit._source;

  const dokumentti: API.Omistaja = {
    id: hit._id,
    __typename: "Omistaja",
    oid,
    kiinteistotunnus,
    lisatty,
    etunimet,
    jakeluosoite,
    nimi,
    paikkakunta,
    paivitetty,
    postinumero,
    sukunimi,
  };
  return dokumentti;
}
