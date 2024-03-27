import { IllegalArgumentError } from "hassu-common/error";
import { DBProjekti } from "../database/model";
import { projektiDatabase } from "../database/projektiDatabase";
import { requirePermissionLuku } from "../user";

export async function varmistaLukuoikeusJaHaeProjekti(oid: string): Promise<DBProjekti> {
  requirePermissionLuku();
  const projektiInDB = await projektiDatabase.loadProjektiByOid(oid);
  if (!projektiInDB) {
    throw new IllegalArgumentError(`Projektia oid:lla ${oid} ei löydy`);
  }
  return projektiInDB;
}
