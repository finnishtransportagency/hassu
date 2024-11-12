import { IllegalArgumentError } from "hassu-common/error";
import { JaaProjektiMutationVariables as Variables } from "hassu-common/graphql/apiModel";
import { cloneDeep, omit } from "lodash";
import { DBProjekti } from "./database/model";
import { JULKAISU_KEYS } from "./database/model/julkaisuKey";
import { projektiDatabase } from "./database/projektiDatabase";
import { fileService } from "./files/fileService";
import { ProjektiPaths } from "./files/ProjektiPath";
import { requireAdmin } from "./user";
import { velho as velhoClient } from "./velho/velhoClient";

export async function jaaProjekti(input: Variables) {
  requireAdmin();
  const srcProjekti = await projektiDatabase.loadProjektiByOid(input.oid);
  if (!srcProjekti) {
    throw new IllegalArgumentError(`Jaettavaa projektia ei löydy oid:lla '${input.oid}'`);
  }
  const targetProjekti = await projektiDatabase.loadProjektiByOid(input.targetOid);
  if (targetProjekti) {
    throw new IllegalArgumentError(`Kohde projekti oid:lla '${input.targetOid}' on jo VLS-järjestelmässä`);
  }

  const targetProjektiFromVelho = await velhoClient.loadProjekti(input.targetOid);
  if (!targetProjektiFromVelho.velho) {
    throw new Error(`Kohde projektia oid:lla '${input.targetOid}' ei löydy Projektivelhosta`);
  }

  const clonedProjekti = cloneDeep(srcProjekti);
  JULKAISU_KEYS.forEach((julkaisuKey) => clonedProjekti[julkaisuKey]?.forEach((julkaisu) => (julkaisu.kopioituToiseltaProjektilta = true)));

  const targetProjektiToCreate: DBProjekti = {
    ...omit(clonedProjekti, "oid", "velho", "kayttoOikeudet", "salt"),
    oid: input.targetOid,
    versio: srcProjekti.versio ?? 1,
    velho: targetProjektiFromVelho.velho,
    kayttoOikeudet: targetProjektiFromVelho.kayttoOikeudet,
  };

  await projektiDatabase.createProjekti(targetProjektiToCreate);
  await fileService.copyYllapitoFolder(new ProjektiPaths(input.oid), new ProjektiPaths(input.targetOid));
}
