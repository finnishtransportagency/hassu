import { KirjaamoOsoite } from "../../../common/graphql/apiModel";
import { requirePermissionLuku } from "../user";
import { kirjaamoOsoitteetService } from "./kirjaamoOsoitteetService";

export async function listKirjaamoOsoitteet(): Promise<KirjaamoOsoite[]> {
  requirePermissionLuku();
  return kirjaamoOsoitteetService.listKirjaamoOsoitteet();
}
