import * as userService from "../service/userService";

export async function getCurrentUser() {
  return userService.getVaylaUser();
}
