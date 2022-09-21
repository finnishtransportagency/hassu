import { VaylaKayttajaTyyppi } from "../../../../common/graphql/apiModel";
import { Person } from "../kayttajas";

function adaptAccounttype(accountType: string) {
  return {
    "A-tunnus": VaylaKayttajaTyyppi.A_TUNNUS,
    "L-tunnus": VaylaKayttajaTyyppi.L_TUNNUS,
    "LX-tunnus": VaylaKayttajaTyyppi.LX_TUNNUS,
  }[accountType];
}

export function adaptPersonSearchResult(responseJson: any, kayttajas: Record<string, Person>): void {
  responseJson.person?.person?.forEach(
    (person: {
      FirstName: string[];
      LastName: string[];
      AccountName: string[];
      Company: string[];
      Email: string[];
      MobilePhone: string[];
      Accounttype: string[];
    }) => {
      const uid = getFirstElementFromArrayOrEmpty(person.AccountName);
      if (uid) {
        const email = getFirstElementFromArrayOrEmpty(person.Email).toLowerCase().trim();

        if (kayttajas[uid]) {
          if (email && !kayttajas[uid].email.includes(email)) {
            kayttajas[uid].email.push(email);
          }
          return;
        }
        kayttajas[uid] = {
          vaylaKayttajaTyyppi: adaptAccounttype(getFirstElementFromArrayOrEmpty(person.Accounttype)),
          etuNimi: getFirstElementFromArrayOrEmpty(person.FirstName),
          sukuNimi: getFirstElementFromArrayOrEmpty(person.LastName),
          organisaatio: getFirstElementFromArrayOrEmpty(person.Company),
          email: [email],
          puhelinnumero: getFirstElementFromArrayOrEmpty(person.MobilePhone),
        };
      }
    }
  );
}

function getFirstElementFromArrayOrEmpty(strings: string[]) {
  return strings?.[0] || "";
}
