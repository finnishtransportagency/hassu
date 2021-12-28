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
    for (const uid in this.kayttajaMap) {
      if (this.kayttajaMap.hasOwnProperty(uid)) {
        const kayttaja = this.kayttajaMap[uid];
        if (kayttaja.email === email) {
          return kayttaja;
        }
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
}
