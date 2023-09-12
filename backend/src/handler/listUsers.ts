import { requirePermissionLuku } from "../user";
import { personSearch } from "../personSearch/personSearchClient";
import { Kayttaja, ListaaKayttajatInput } from "hassu-common/graphql/apiModel";
import { log } from "../logger";

export async function listUsers(input: ListaaKayttajatInput): Promise<Kayttaja[]> {
  requirePermissionLuku();
  const kayttajas = await personSearch.getKayttajas();
  if (input.kayttajatunnus) {
    return input.kayttajatunnus
      .map((kayttajatunnus) => kayttajas.getKayttajaByUid(kayttajatunnus))
      .filter((kayttaja) => !!kayttaja) as Kayttaja[];
  }

  if (typeof input.hakusana === "string") {
    return kayttajas.findByText(input.hakusana);
  }

  log.warn("listUsers called without parameters, returning empty results.");
  return [];
}
