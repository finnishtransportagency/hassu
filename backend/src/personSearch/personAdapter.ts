import { DBVaylaUser } from "../database/model";
import { Kayttaja } from "hassu-common/graphql/apiModel";
import merge from "lodash/merge";
import { Kayttajas, Person } from "./kayttajas";
import pickBy from "lodash/pickBy";
import { log } from "../logger";

export function mergeKayttajas(users: DBVaylaUser[], valtuusHallintaKayttajas: Kayttajas) {
  return users.map<DBVaylaUser>((user) => {
    const kayttaja = valtuusHallintaKayttajas.getKayttajaByUid(user.kayttajatunnus);
    return (kayttaja && mergeKayttaja(user, kayttaja)) ?? user;
  });
}

export function mergeKayttaja(user: Partial<DBVaylaUser>, account: Kayttaja): DBVaylaUser | undefined {
  const { organisaatio, email, etunimi, sukunimi } = account;
  const kayttajatunnus = account.uid;
  if (!organisaatio || !email || !kayttajatunnus) {
    log.warn("Käyttäjältä puuttuu organisaatio, email tai kayttajatunnus", { kayttaja: account });
    return undefined;
  }
  return merge(user, { organisaatio, email, etunimi, sukunimi, kayttajatunnus });
}

export function adaptKayttaja(account: Kayttaja): DBVaylaUser {
  const vaylaUser: DBVaylaUser = {} as any;
  mergeKayttaja(vaylaUser, account);
  return vaylaUser;
}

export function adaptPerson(uid: string, person: Person): Kayttaja {
  return removeUndefinedFields({
    __typename: "Kayttaja",
    email: person.email[0],
    etunimi: person.etuNimi,
    organisaatio: person.organisaatio,
    puhelinnumero: person.puhelinnumero,
    sukunimi: person.sukuNimi,
    uid,
  }) as Kayttaja;
}

function removeUndefinedFields(object: Kayttaja): Partial<Kayttaja> {
  return pickBy(object, (value) => value !== undefined);
}
