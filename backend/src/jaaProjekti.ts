import { IllegalArgumentError } from "hassu-common/error";
import { JaaProjektiMutationVariables as Variables } from "hassu-common/graphql/apiModel";
import { projektiDatabase } from "./database/projektiDatabase";
import { requireAdmin } from "./user";
import { velho as velhoClient } from "./velho/velhoClient";

export async function jaaProjekti(input: Variables) {
  requireAdmin();
  const projekti = await projektiDatabase.loadProjektiByOid(input.oid);
  if (!projekti) {
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
}
