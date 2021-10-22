import { DBVaylaUser } from "../database/model/projekti";
import { Kayttaja } from "../../../common/graphql/apiModel";

export function mergeKayttaja(user: DBVaylaUser, account: Kayttaja) {
  user.puhelinnumero = account.puhelinnumero;
  user.nimi = account.sukuNimi + ", " + account.etuNimi;
  user.organisaatio = account.organisaatio;
  user.kayttajatunnus = account.uid;
  user.email = account.email;
}

export function adaptKayttaja(account: Kayttaja) {
  const vaylaUser: DBVaylaUser = {} as any;
  mergeKayttaja(vaylaUser, account);
  return vaylaUser;
}
