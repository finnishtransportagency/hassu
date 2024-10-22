import { userService } from "../user";
import * as API from "hassu-common/graphql/apiModel";
import { parameters } from "../aws/parameters";

export async function getCurrentUser(): Promise<API.NykyinenKayttaja> {
  const kayttaja = userService.requireVaylaUser();
  const ashaEnabled = await parameters.isAsianhallintaIntegrationEnabled();
  const uspaEnabled = await parameters.isUspaIntegrationEnabled();
  if (ashaEnabled || uspaEnabled) {
    kayttaja.features = { __typename: "Features", asianhallintaIntegraatio: ashaEnabled, uspaIntegraatio: uspaEnabled };
  }
  return kayttaja;
}
