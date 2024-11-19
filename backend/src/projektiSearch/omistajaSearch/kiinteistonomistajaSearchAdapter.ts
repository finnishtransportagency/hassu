import { getLocalizedCountryName } from "hassu-common/getLocalizedCountryName";
import * as API from "hassu-common/graphql/apiModel";
import { formatKiinteistotunnusForDisplay } from "hassu-common/util/formatKiinteistotunnus";
import { DBOmistaja } from "../../database/omistajaDatabase";
import { log } from "../../logger";

export type OmistajaDocument = Pick<
  DBOmistaja,
  | "jakeluosoite"
  | "kiinteistotunnus"
  | "nimi"
  | "oid"
  | "paikkakunta"
  | "postinumero"
  | "maakoodi"
  | "lisatty"
  | "paivitetty"
  | "suomifiLahetys"
  | "kaytossa"
  | "userCreated"
> & { maa: string | null; viimeisinLahetysaika: string | null; viimeisinTila: API.TiedotettavanLahetyksenTila | null };

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
  lahetykset,
}: DBOmistaja): OmistajaDocument {
  const viimeisinLahetys = lahetykset?.sort((a, b) => b.lahetysaika.localeCompare(a.lahetysaika))[0];
  return {
    jakeluosoite,
    kiinteistotunnus: kiinteistotunnus ? formatKiinteistotunnusForDisplay(kiinteistotunnus) : kiinteistotunnus,
    oid,
    nimi: nimi ? nimi : [etunimet, sukunimi].filter((n) => !!n).join(" "),
    paikkakunta,
    postinumero,
    maa: maakoodi ? getLocalizedCountryName("fi", maakoodi) : null,
    maakoodi,
    lisatty,
    paivitetty,
    suomifiLahetys,
    kaytossa,
    userCreated,
    viimeisinLahetysaika: viimeisinLahetys?.lahetysaika ?? null,
    viimeisinTila: viimeisinLahetys?.tila ?? null,
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
  const {
    kiinteistotunnus,
    lisatty,
    oid,
    jakeluosoite,
    nimi,
    paikkakunta,
    paivitetty,
    postinumero,
    maa,
    maakoodi,
    viimeisinLahetysaika,
    viimeisinTila,
  } = hit._source;

  const dokumentti: API.Omistaja = {
    id: hit._id,
    __typename: "Omistaja",
    oid,
    kiinteistotunnus,
    lisatty,
    jakeluosoite,
    nimi,
    paikkakunta,
    maa,
    maakoodi,
    paivitetty,
    postinumero,
    viimeisinLahetysaika,
    viimeisinTila,
  };
  return dokumentti;
}
