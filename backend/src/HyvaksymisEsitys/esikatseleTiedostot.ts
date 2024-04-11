import * as API from "hassu-common/graphql/apiModel";
import { adaptHyvaksymisEsitysToSave } from "./adaptHyvaksymisEsitysToSave";
import createLadattavatTiedostot from "./lautaslinkit/createLadattavatTiedostot";
import haeHyvaksymisEsityksenTiedostoTiedot, { ProjektiTiedostoineen } from "./dynamoDBCalls/getProjektiTiedostoineen";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../user";

export default async function esikatseleHyvaksymisEsityksenTiedostot({
  oid,
  hyvaksymisEsitys,
}: API.EsikatseleHyvaksymisEsityksenTiedostotQueryVariables): Promise<API.LadattavatTiedostot> {
  requirePermissionLuku();
  const dbProjekti: ProjektiTiedostoineen = await haeHyvaksymisEsityksenTiedostoTiedot(oid);
  requirePermissionMuokkaa(dbProjekti);
  const muokattavaHyvaksymisEsitys = adaptHyvaksymisEsitysToSave(dbProjekti.muokattavaHyvaksymisEsitys, hyvaksymisEsitys);
  const aineistopaketti = "(esikatselu)";
  return await createLadattavatTiedostot(dbProjekti, muokattavaHyvaksymisEsitys, aineistopaketti);
}
