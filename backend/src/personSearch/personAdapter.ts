import { DBVaylaUser } from "../database/model/projekti";
import { Kayttaja } from "../../../common/graphql/apiModel";
import * as _ from "lodash";

export function mergeKayttaja(user: DBVaylaUser, account: Kayttaja) {
  const { organisaatio, email } = account;
  const nimi = account.sukuNimi + ", " + account.etuNimi;
  const kayttajatunnus = account.uid;
  _.mergeWith(user, { organisaatio, email, nimi, kayttajatunnus });
}

export function adaptKayttaja(account: Kayttaja) {
  const vaylaUser: DBVaylaUser = {} as any;
  mergeKayttaja(vaylaUser, account);
  return vaylaUser;
}
