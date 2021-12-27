import { Kayttaja, VaylaKayttajaTyyppi } from "../../../../common/graphql/apiModel";

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
    etuNimi: "Pekka",
    sukuNimi: "Projari",
    uid: "A123",
    email: "pekka.projari@vayla.fi",
    organisaatio: "Väylävirasto",
    puhelinnumero: "123456789",
    vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.A_TUNNUS,
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
    etuNimi: "Matti",
    sukuNimi: "Meikäläinen",
    organisaatio: "ELY",
    puhelinnumero: "123456789",
    uid: "A000111",
    vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.A_TUNNUS,
  };

  manuMuokkaaja: Kayttaja = {
    __typename: "Kayttaja",
    email: "namu.muokkaaja@vayla.fi",
    etuNimi: "Manu",
    sukuNimi: "Muokkaaja",
    organisaatio: "Väylävirasto",
    puhelinnumero: "123456789",
    uid: "LX1",
    vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.LX_TUNNUS,
  };
}
