import { getLocalizedCountryName } from "hassu-common/getLocalizedCountryName";
import * as API from "hassu-common/graphql/apiModel";
import { formatKiinteistotunnusForDisplay } from "hassu-common/util/formatKiinteistotunnus";
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
  | "maakoodi"
  | "sukunimi"
  | "lisatty"
  | "paivitetty"
  | "suomifiLahetys"
  | "kaytossa"
  | "userCreated"
> & { maa: string | null };

export function adaptOmistajaToIndex({
  etunimet,
  jakeluosoite,
  kiinteistotunnus,
  oid,
  nimi,
  paikkakunta,
  postinumero,
  maakoodi,
  sukunimi,
  lisatty,
  paivitetty,
  suomifiLahetys,
  kaytossa,
  userCreated,
}: DBOmistaja): OmistajaDocument {
  return {
    etunimet,
    jakeluosoite,
    kiinteistotunnus: kiinteistotunnus ? formatKiinteistotunnusForDisplay(kiinteistotunnus) : kiinteistotunnus,
    oid,
    nimi,
    paikkakunta,
    postinumero,
    maa: maakoodi ? getLocalizedCountryName("fi", maakoodi) : null,
    maakoodi,
    sukunimi,
    lisatty,
    paivitetty,
    suomifiLahetys,
    kaytossa,
    userCreated,
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
  _source: Omit<OmistajaDocument, "id">;
};

function mapHitToApiOmistaja(hit: OmistajaDocumentHit) {
  const { kiinteistotunnus, lisatty, oid, etunimet, jakeluosoite, nimi, paikkakunta, paivitetty, postinumero, sukunimi, maa, maakoodi } =
    hit._source;

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
    maa,
    maakoodi,
    paivitetty,
    postinumero,
    sukunimi,
  };
  return dokumentti;
}
