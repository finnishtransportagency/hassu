import { velho } from "../velho/velhoClient";
import { HaeVelhoProjektiAineistoLinkkiQueryVariables } from "../../../common/graphql/apiModel";
import { requirePermissionMuokkaaProjekti } from "./projektiHandler";

class VelhoDocumentHandler {
  async listaaVelhoProjektiAineistot(oid: string) {
    await requirePermissionMuokkaaProjekti(oid);

    return await velho.loadProjektiAineistot(oid);
  }

  async haeVelhoProjektiAineistoLinkki({ oid, dokumenttiOid }: HaeVelhoProjektiAineistoLinkkiQueryVariables) {
    await requirePermissionMuokkaaProjekti(oid);
    return await velho.getLinkForDocument(dokumenttiOid);
  }
}

export const velhoDocumentHandler = new VelhoDocumentHandler();
