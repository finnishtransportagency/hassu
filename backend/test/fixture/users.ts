import { Kayttaja, ProjektiKayttaja, ProjektiRooli } from "../../../common/graphql/apiModel";

export const vaylaMatti: Kayttaja = {
  __typename: "Kayttaja",
  etuNimi: "Matti",
  sukuNimi: "Meikalainen",
  uid: "A000111",
  roolit: ["role1", "role2"],
  vaylaKayttaja: true,
};

export const vaylaMattiFromPersonSearch: Kayttaja = {
  ...vaylaMatti,
  email: "matti.meikalainen@vayla.fi",
  etuNimi: "Matti",
  sukuNimi: "Meikäläinen",
  organisaatio: "Väylävirasto",
  puhelinnumero: "123456789",
};

function fieldsFromPersonSearch(kayttaja: Kayttaja): any {
  return {
    kayttajatunnus: kayttaja.uid,
    organisaatio: kayttaja.organisaatio,
    email: kayttaja.email,
    puhelinnumero: kayttaja.puhelinnumero,
  };
}

export const vaylaMattiProjektiKayttaja: ProjektiKayttaja = {
  __typename: "ProjektiKayttaja",
  rooli: ProjektiRooli.OMISTAJA,
  nimi: "Meikäläinen, Matti",
  ...fieldsFromPersonSearch(vaylaMattiFromPersonSearch),
};

export const pekkaProjari: Kayttaja = {
  __typename: "Kayttaja",
  etuNimi: "Pekka",
  sukuNimi: "Projari",
  uid: "A123",
  roolit: ["role1", "role2"],
  vaylaKayttaja: true,
};

export const pekkaProjariFromPersonSearch: Kayttaja = {
  ...pekkaProjari,
  email: "pekka.projari@vayla.fi",
  organisaatio: "Väylävirasto",
  puhelinnumero: "123456789",
};

export const pekkaProjariProjektiKayttaja: ProjektiKayttaja = {
  __typename: "ProjektiKayttaja",
  rooli: ProjektiRooli.PROJEKTIPAALLIKKO,
  nimi: "Projari, Pekka",
  ...fieldsFromPersonSearch(pekkaProjariFromPersonSearch),
};
