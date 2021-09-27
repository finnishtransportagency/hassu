import * as userService from "../service/userService";

export async function getCurrentUser() {
  if (userService.isVaylaUser()) {
    return userService.getVaylaUser();
  }
}
