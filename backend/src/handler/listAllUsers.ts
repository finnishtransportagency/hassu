import * as userService from "../service/userService";

export async function listAllUsers() {
  return userService.listAllUsers();
}
