import { DBVaylaUser } from "../database/model/projekti";
import { Kayttaja } from "../../../common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { Person } from "./kayttajas";
import { removeUndefinedFields } from "../util/objectUtil";

export function mergeKayttaja(user: Partial<DBVaylaUser>, account: Kayttaja) {
  const { organisaatio, email } = account;
  const nimi = account.sukuNimi + ", " + account.etuNimi;
  const kayttajatunnus = account.uid;
  mergeWith(user, { organisaatio, email, nimi, kayttajatunnus });
}

export function adaptKayttaja(account: Kayttaja) {
  const vaylaUser: DBVaylaUser = {} as any;
  mergeKayttaja(vaylaUser, account);
  return vaylaUser;
}

export function adaptPerson(uid: string, person: Person): Kayttaja {
  return removeUndefinedFields({
    __typename: "Kayttaja",
    email: person.email[0],
    etuNimi: person.etuNimi,
    organisaatio: person.organisaatio,
    puhelinnumero: person.puhelinnumero,
    sukuNimi: person.sukuNimi,
    uid,
    vaylaKayttajaTyyppi: person.vaylaKayttajaTyyppi,
  }) as Kayttaja;
}
