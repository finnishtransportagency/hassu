import { requirePermissionLuonti } from "../user";
import { personSearch } from "../personSearch/personSearchClient";
import { ListaaKayttajatInput } from "../../../common/graphql/apiModel";

export async function listAllUsers(input: ListaaKayttajatInput) {
  requirePermissionLuonti();
  const kayttajas = await personSearch.getKayttajas();
  if (input.kayttajatunnus) {
    return input.kayttajatunnus
      .map((kayttajatunnus) => kayttajas.getKayttajaByUid(kayttajatunnus))
      .filter((kayttaja) => !!kayttaja);
  }
  return kayttajas.asList();
}
