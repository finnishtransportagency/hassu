import { requirePermissionLuku, requirePermissionMuokkaa } from "../user";
import { log } from "../logger";
import { projektiDatabase } from "../database/projektiDatabase";
import { NotFoundError } from "../error/NotFoundError";
import { velho } from "../velho/velhoClient";
import { HaeVelhoProjektiAineistoLinkkiQueryVariables } from "../../../common/graphql/apiModel";

class VelhoDocumentHandler {
  async listaaVelhoProjektiAineistot(oid: string) {
    await VelhoDocumentHandler.requirePermissionMuokkaaProjekti(oid);

    return await velho.loadProjektiAineistot(oid);
  }

  async haeVelhoProjektiAineistoLinkki({ oid, dokumenttiOid }: HaeVelhoProjektiAineistoLinkkiQueryVariables) {
    await VelhoDocumentHandler.requirePermissionMuokkaaProjekti(oid);
    return await velho.getLinkForDocument(dokumenttiOid);
  }

  private static async requirePermissionMuokkaaProjekti(oid: string) {
    requirePermissionLuku();
    log.info("Loading projekti", { oid });
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (!projekti) {
      throw new NotFoundError("Projekti not found " + oid);
    }
    requirePermissionMuokkaa(projekti);
  }
}

export const velhoDocumentHandler = new VelhoDocumentHandler();
