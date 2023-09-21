import { userService } from "../user";
import * as API from "hassu-common/graphql/apiModel";
import { parameters } from "../aws/parameters";

export async function getCurrentUser(): Promise<API.NykyinenKayttaja> {
  const kayttaja = userService.requireVaylaUser();
  if (await parameters.isAsianhallintaIntegrationEnabled()) {
    kayttaja.features = { __typename: "Features", asianhallintaIntegraatio: true };
  }
  return kayttaja;
}
