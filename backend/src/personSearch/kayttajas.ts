import { Kayttaja } from "../../../common/graphql/apiModel";

export class Kayttajas {
  kayttajaMap: Record<string, Kayttaja>;

  constructor(kayttajaMap: Record<string, Kayttaja>) {
    this.kayttajaMap = kayttajaMap;
  }

  getKayttajaByUid(uid: string | undefined): Kayttaja | undefined {
    if (uid) {
      return this.kayttajaMap[uid];
    }
  }

  findByEmail(email: string): Kayttaja | undefined {
    for (const kayttaja of Object.values(this.kayttajaMap)) {
      if (kayttaja.email === email) {
        return kayttaja;
      }
    }
  }

  static fromKayttajaList(kayttajas: Kayttaja[]) {
    return new Kayttajas(
      kayttajas.reduce((map, kayttaja) => {
        if (kayttaja.uid) {
          map[kayttaja.uid] = kayttaja;
        }
        return map;
      }, {} as Record<string, Kayttaja>)
    );
  }

  asList() {
    const list = [];
    for (const uid in this.kayttajaMap) {
      if (this.kayttajaMap.hasOwnProperty(uid)) {
        list.push(this.kayttajaMap[uid]);
      }
    }
    return list;
  }

  asMap() {
    return this.kayttajaMap;
  }

  findByText(hakusana: string): Kayttaja[] {
    if (hakusana.length >= 3) {
      return Object.values(this.kayttajaMap).reduce((list, kayttaja) => {
        if (kayttaja.etuNimi.includes(hakusana) || kayttaja.sukuNimi.includes(hakusana)) {
          list.push(kayttaja);
        }
        return list;
      }, [] as Kayttaja[]);
    }
    return [];
  }
}
