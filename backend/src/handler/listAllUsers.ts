import { requirePermissionLuonti } from "../service/userService";
import { personSearch } from "../personSearch/personSearchClient";

export async function listAllUsers() {
  requirePermissionLuonti();
  return personSearch.listAccounts();
}
