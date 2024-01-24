import { DBVaylaUser } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";

export function adaptProjektiKayttajaJulkinen(kayttoOikeus: DBVaylaUser): API.ProjektiKayttajaJulkinen {
  return {
    __typename: "ProjektiKayttajaJulkinen",
    etunimi: kayttoOikeus.etunimi,
    sukunimi: kayttoOikeus.sukunimi,
    email: kayttoOikeus.email,
    puhelinnumero: kayttoOikeus.puhelinnumero,
    organisaatio: kayttoOikeus.organisaatio,
    projektiPaallikko: kayttoOikeus.tyyppi === API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
    elyOrganisaatio: kayttoOikeus.elyOrganisaatio,
  };
}
