import * as userService from "../service/userService";
import { VaylaUser } from "../service/userService";
import { User } from "../api/API";

function adaptVaylaUser(vaylaUser: VaylaUser): User {
  return {
    __typename: "User",
    firstName: vaylaUser.firstName,
    lastName: vaylaUser.lastName,
    uid: vaylaUser.uid,
    vaylaUser: true,
  };
}

export async function getCurrentUser() {
  if (userService.isVaylaUser()) {
    const vaylaUser = userService.getVaylaUser();
    return adaptVaylaUser(vaylaUser);
  }
}
