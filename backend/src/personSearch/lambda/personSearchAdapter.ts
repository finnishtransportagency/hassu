import { Kayttaja, VaylaKayttajaTyyppi } from "../../../../common/graphql/apiModel";

function adaptAccounttype(accountType: string) {
  return {
    "A-tunnus": VaylaKayttajaTyyppi.A_TUNNUS,
    "L-tunnus": VaylaKayttajaTyyppi.L_TUNNUS,
    "LX-tunnus": VaylaKayttajaTyyppi.LX_TUNNUS,
  }[accountType];
}

export function adaptPersonSearchResult(responseJson: any): Kayttaja[] {
  if (!responseJson.person?.person) {
    return [];
  }
  return responseJson.person.person.map(
    (person: {
      FirstName: string[];
      LastName: string[];
      AccountName: string[];
      Company: string[];
      Email: string[];
      MobilePhone: string[];
      Accounttype: string[];
    }) => {
      return {
        __typename: "Kayttaja",
        vaylaKayttajaTyyppi: adaptAccounttype(getFirstElementFromArrayOrEmpty(person.Accounttype)),
        etuNimi: getFirstElementFromArrayOrEmpty(person.FirstName),
        sukuNimi: getFirstElementFromArrayOrEmpty(person.LastName),
        uid: getFirstElementFromArrayOrEmpty(person.AccountName),
        organisaatio: getFirstElementFromArrayOrEmpty(person.Company),
        email: getFirstElementFromArrayOrEmpty(person.Email),
        puhelinnumero: getFirstElementFromArrayOrEmpty(person.MobilePhone),
      };
    }
  );
}

function getFirstElementFromArrayOrEmpty(strings: string[]) {
  return strings?.[0] || "";
}
