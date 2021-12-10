import { userService } from "../user";

export async function getCurrentUser() {
  return userService.getVaylaUser();
}
