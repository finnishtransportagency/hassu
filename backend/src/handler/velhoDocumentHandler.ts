import { velho } from "../velho/velhoClient";
import { HaeVelhoProjektiAineistoLinkkiQueryVariables, ListaaVelhoProjektiAineistotQueryVariables } from "../../../common/graphql/apiModel";
import { requirePermissionMuokkaaProjekti } from "../projekti/projektiHandler";

class VelhoDocumentHandler {
  async listaaVelhoProjektiAineistot(variables: ListaaVelhoProjektiAineistotQueryVariables) {
    await requirePermissionMuokkaaProjekti(variables.oid);

    return velho.loadProjektiAineistot(variables);
  }

  async haeVelhoProjektiAineistoLinkki({ oid, dokumenttiOid }: HaeVelhoProjektiAineistoLinkkiQueryVariables) {
    await requirePermissionMuokkaaProjekti(oid);
    return velho.getLinkForDocument(dokumenttiOid);
  }
}

export const velhoDocumentHandler = new VelhoDocumentHandler();
