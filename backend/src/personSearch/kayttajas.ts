import { Kayttaja, VaylaKayttajaTyyppi } from "../../../common/graphql/apiModel";
import { adaptPerson } from "./personAdapter";

export type Person = {
  vaylaKayttajaTyyppi?: VaylaKayttajaTyyppi | null;
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
    if (uid) {
      return adaptPerson(uid, this.personMap[uid]);
    }
  }

  findByEmail(email: string): Kayttaja | undefined {
    for (const [uid, person] of Object.entries(this.personMap)) {
      if (person.email.includes(email.toLowerCase().trim())) {
        return adaptPerson(uid, person);
      }
    }
  }

  /**
   * For test usage
   */
  static fromKayttajaList(kayttajas: Kayttaja[]) {
    return new Kayttajas(
      kayttajas.reduce((map, kayttaja) => {
        if (kayttaja.uid) {
          map[kayttaja.uid] = {
            ...kayttaja,
            email: [kayttaja.email],
          } as Person;
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

  asMap() {
    return this.personMap;
  }

  findByText(hakusana: string): Kayttaja[] {
    if (hakusana.length >= 3) {
      return Object.entries(this.personMap).reduce((list, [uid, person]) => {
        if (
          (person.sukuNimi.toLowerCase() + ", " + person.etuNimi.toLowerCase()).includes(hakusana.toLowerCase()) ||
          (person.sukuNimi.toLowerCase() + " " + person.etuNimi.toLowerCase()).includes(hakusana.toLowerCase())
        ) {
          list.push(adaptPerson(uid, person));
        }
        return list;
      }, [] as Kayttaja[]);
    }
    return [];
  }
}
