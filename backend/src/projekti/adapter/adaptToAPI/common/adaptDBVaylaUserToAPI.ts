import { DBVaylaUser } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";

export function adaptDBVaylaUsertoAPIProjektiKayttaja(users: DBVaylaUser[]): API.ProjektiKayttaja[] {
  return users.map((user) => ({
    __typename: "ProjektiKayttaja",
    ...user,
  }));
}
