import * as userService from "../service/userService";
import { requireVaylaUser } from "../service/userService";

export async function listAllUsers() {
  requireVaylaUser();
  return userService.listAllUsers();
}
