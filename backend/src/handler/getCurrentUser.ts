import { userService } from "../user";
import * as API from "../../../common/graphql/apiModel";

export async function getCurrentUser(): Promise<API.NykyinenKayttaja> {
  return userService.requireVaylaUser();
}
