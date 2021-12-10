import { requirePermissionLuonti } from "../user";
import { personSearch } from "../personSearch/personSearchClient";

export async function listAllUsers() {
  requirePermissionLuonti();
  return personSearch.listAccounts();
}
