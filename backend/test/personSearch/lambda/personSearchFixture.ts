import { Kayttaja } from "../../../../common/graphql/apiModel";

export class PersonSearchFixture {
  pekkaProjariSearchResult = {
    person: {
      person: [
        {
          ObjectID: ["abc-123"],
          DisplayName: ["Projari Pekka"],
          Accounttype: ["A-tunnus"],
          Disabled: ["False"],
          AccountName: ["A123"],
          Company: ["Väylävirasto"],
          Yritystunnus: ["123-1"],
          FirstName: ["Pekka"],
          LastName: ["Projari"],
          Email: ["pekka.projari@vayla.fi"],
          MobilePhone: ["123456789"],
        },
      ],
    },
  };

  pekkaProjari: Kayttaja = {
    __typename: "Kayttaja",
    etunimi: "Pekka",
    sukunimi: "Projari",
    uid: "A123",
    email: "pekka.projari@vayla.fi",
    organisaatio: "Väylävirasto",
    puhelinnumero: "123456789",
  };

  mattiMeikalainenSearchResult = {
    person: {
      person: [
        {
          ObjectID: ["abc-345"],
          DisplayName: ["Meikalainen Matti"],
          Accounttype: ["A-tunnus"],
          Disabled: ["False"],
          AccountName: ["A000111"],
          Company: ["ELY"],
          Yritystunnus: ["123-1"],
          FirstName: ["Matti"],
          LastName: ["Meikäläinen"],
          Email: ["matti.meikalainen@vayla.fi"],
          MobilePhone: ["123456789"],
        },
      ],
    },
  };

  mattiMeikalainen: Kayttaja = {
    __typename: "Kayttaja",
    email: "matti.meikalainen@vayla.fi",
    etunimi: "Matti",
    sukunimi: "Meikäläinen",
    organisaatio: "ELY",
    puhelinnumero: "123456789",
    uid: "A000111",
  };

  manuMuokkaaja: Kayttaja = {
    __typename: "Kayttaja",
    email: "namu.muokkaaja@vayla.fi",
    etunimi: "Manu",
    sukunimi: "Muokkaaja",
    organisaatio: "Väylävirasto",
    puhelinnumero: "123456789",
    uid: "LX1",
  };

  createKayttaja(uid: string): Kayttaja {
    return {
      __typename: "Kayttaja",
      email: (uid + "@vayla.fi").toLowerCase(),
      etunimi: "Etunimi" + uid,
      sukunimi: "Sukunimi" + uid,
      organisaatio: "Väylävirasto",
      puhelinnumero: "123456789",
      uid,
    };
  }
}
