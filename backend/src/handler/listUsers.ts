import { requirePermissionLuonti } from "../user";
import { personSearch } from "../personSearch/personSearchClient";
import { Kayttaja, ListaaKayttajatInput } from "../../../common/graphql/apiModel";

export async function listUsers(input: ListaaKayttajatInput): Promise<Kayttaja[]> {
  requirePermissionLuonti();
  const kayttajas = await personSearch.getKayttajas();
  if (input.kayttajatunnus) {
    return input.kayttajatunnus
      .map((kayttajatunnus) => kayttajas.getKayttajaByUid(kayttajatunnus))
      .filter((kayttaja) => !!kayttaja) as Kayttaja[];
  }

  if (typeof input.hakusana === "string") {
    return kayttajas.findByText(input.hakusana);
  }

  return kayttajas.asList();
}
