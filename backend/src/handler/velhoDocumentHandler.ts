import { velho } from "../velho/velhoClient";
import { HaeVelhoProjektiAineistoLinkkiQueryVariables } from "../../../common/graphql/apiModel";
import { requirePermissionMuokkaaProjekti } from "../projekti/projektiHandler";

class VelhoDocumentHandler {
  async listaaVelhoProjektiAineistot(oid: string) {
    await requirePermissionMuokkaaProjekti(oid);

    return velho.loadProjektiAineistot(oid);
  }

  async haeVelhoProjektiAineistoLinkki({ oid, dokumenttiOid }: HaeVelhoProjektiAineistoLinkkiQueryVariables) {
    await requirePermissionMuokkaaProjekti(oid);
    return velho.getLinkForDocument(dokumenttiOid);
  }
}

export const velhoDocumentHandler = new VelhoDocumentHandler();
