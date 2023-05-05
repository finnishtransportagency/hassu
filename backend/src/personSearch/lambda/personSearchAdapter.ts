import { Person } from "../kayttajas";

export type PersonFromResponse = {
  FirstName: string[];
  LastName: string[];
  AccountName: string[];
  Company: string[];
  Email: string[];
  MobilePhone: string[];
  Accounttype: string[];
};

export function adaptPersonSearchResult(personsFromResponse: PersonFromResponse[] | undefined, personMap: Record<string, Person>): void {
  personsFromResponse?.forEach((person: PersonFromResponse) => {
    const uid = getFirstElementFromArrayOrEmpty(person.AccountName);
    if (uid) {
      const email = getFirstElementFromArrayOrEmpty(person.Email).toLowerCase().trim();

      if (personMap[uid]) {
        if (email && !personMap[uid].email.includes(email)) {
          personMap[uid].email.push(email);
        }
        return;
      }
      personMap[uid] = {
        etuNimi: getFirstElementFromArrayOrEmpty(person.FirstName),
        sukuNimi: getFirstElementFromArrayOrEmpty(person.LastName),
        organisaatio: getFirstElementFromArrayOrEmpty(person.Company),
        email: [email],
        puhelinnumero: getFirstElementFromArrayOrEmpty(person.MobilePhone),
      };
    }
  });
}

function getFirstElementFromArrayOrEmpty(strings: string[]) {
  return strings?.[0] || "";
}
