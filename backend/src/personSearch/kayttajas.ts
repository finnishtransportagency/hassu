import { Kayttaja } from "hassu-common/graphql/apiModel";
import { adaptPerson } from "./personAdapter";
import { log } from "../logger";
import { formatNimi } from "../util/userUtil";

export type Person = {
  etuNimi: string;
  sukuNimi: string;
  organisaatio?: string;
  email: string[];
  puhelinnumero?: string;
};

export class Kayttajas {
  personMap: Record<string, Person>;

  constructor(personMap: Record<string, Person>) {
    this.personMap = personMap;
  }

  getKayttajaByUid(uid: string | undefined): Kayttaja | undefined {
    if (uid && this.personMap[uid]) {
      return adaptPerson(uid, this.personMap[uid]);
    } else {
      log.error("person not found", uid);
    }
  }

  findByEmail(email: string): Kayttaja | undefined {
    const lowercaseEmail = email.toLowerCase().trim();
    for (const [uid, person] of Object.entries(this.personMap)) {
      if (person.email.includes(lowercaseEmail)) {
        return adaptPerson(uid, person);
      }
    }
  }

  /**
   * For test usage
   */
  static fromKayttajaList(kayttajas: Kayttaja[]): Kayttajas {
    return new Kayttajas(
      kayttajas.reduce((map, kayttaja) => {
        if (!kayttaja.email) {
          throw new Error("fromKayttajaList: kayttaja.email puuttuu");
        }
        if (kayttaja.uid) {
          map[kayttaja.uid] = {
            etuNimi: kayttaja.etunimi,
            sukuNimi: kayttaja.sukunimi,
            organisaatio: kayttaja.organisaatio ?? undefined,
            puhelinnumero: kayttaja.puhelinnumero ?? undefined,
            email: [kayttaja.email],
          };
        }
        return map;
      }, {} as Record<string, Person>)
    );
  }

  asList(): Kayttaja[] {
    const list = [];
    for (const uid in this.personMap) {
      list.push(adaptPerson(uid, this.personMap[uid]));
    }
    return list;
  }

  asMap(): Record<string, Person> {
    return this.personMap;
  }

  findByText(hakusana: string): Kayttaja[] {
    if (hakusana.length >= 3) {
      return Object.entries(this.personMap)
        .reduce((list, [uid, person]) => {
          if (
            (person.etuNimi.toLowerCase() + ", " + person.sukuNimi.toLowerCase()).includes(hakusana.toLowerCase()) ||
            (person.etuNimi.toLowerCase() + " " + person.sukuNimi.toLowerCase()).includes(hakusana.toLowerCase())
          ) {
            list.push(adaptPerson(uid, person));
          }
          return list;
        }, [] as Kayttaja[])
        .sort((person1, person2) => formatNimi(person1).localeCompare(formatNimi(person2)));
    }
    return [];
  }
}
