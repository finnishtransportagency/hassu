import * as API from "hassu-common/graphql/apiModel";
import { UudelleenKuulutus } from "../../../../database/model";
import { adaptPakotettuLokalisoituTekstiToAPI } from "..";

export function adaptUudelleenKuulutusJulkinen(
  uudelleenKuulutus: UudelleenKuulutus | null | undefined
): API.UudelleenKuulutus | null | undefined {
  if (!uudelleenKuulutus) {
    return uudelleenKuulutus;
  }
  return {
    __typename: "UudelleenKuulutus",
    tila: uudelleenKuulutus.tila,
    alkuperainenHyvaksymisPaiva: uudelleenKuulutus.alkuperainenHyvaksymisPaiva,
    selosteKuulutukselle: adaptPakotettuLokalisoituTekstiToAPI(uudelleenKuulutus?.selosteKuulutukselle),
    selosteLahetekirjeeseen: null,
  };
}
