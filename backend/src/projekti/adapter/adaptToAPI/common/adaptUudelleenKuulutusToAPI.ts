import { adaptPakotettuLokalisoituTekstiToAPI } from ".";
import { UudelleenKuulutus } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";

export function adaptUudelleenKuulutusToAPI(
  uudelleenKuulutus: UudelleenKuulutus | null | undefined
): API.UudelleenKuulutus | null | undefined {
  if (!uudelleenKuulutus) {
    return uudelleenKuulutus;
  }
  return {
    __typename: "UudelleenKuulutus",
    tila: uudelleenKuulutus.tila,
    alkuperainenHyvaksymisPaiva: uudelleenKuulutus.alkuperainenHyvaksymisPaiva,
    selosteKuulutukselle: adaptPakotettuLokalisoituTekstiToAPI(uudelleenKuulutus.selosteKuulutukselle),
    selosteLahetekirjeeseen: adaptPakotettuLokalisoituTekstiToAPI(uudelleenKuulutus.selosteLahetekirjeeseen),
    tiedotaKiinteistonomistajia: uudelleenKuulutus.tiedotaKiinteistonomistajia,
    alkuperainenKuulutusPaiva: uudelleenKuulutus.alkuperainenKuulutusPaiva,
  };
}
