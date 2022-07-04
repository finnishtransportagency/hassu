import { LisaAineisto, ListaaLisaAineistoQueryVariables } from "../../../common/graphql/apiModel";
import { requirePermissionLuku, requirePermissionMuokkaa } from "../user";
import { log } from "../logger";
import { projektiDatabase } from "../database/projektiDatabase";
import { NotFoundError } from "../error/NotFoundError";
import { lisaAineistoService } from "../aineisto/lisaAineistoService";

class LisaAineistoHandler {
  async listaaLisaAineisto({
    oid: oid,
    lisaAineistoTiedot: params,
  }: ListaaLisaAineistoQueryVariables): Promise<LisaAineisto[]> {
    requirePermissionLuku();
    log.info("Loading projekti", { oid });
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      requirePermissionMuokkaa(projekti);
      lisaAineistoService.validateHash(oid, projekti.salt, params);
      return lisaAineistoService.listaaLisaAineisto(projekti, params);
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  }
}

export const lisaAineistoHandler = new LisaAineistoHandler();
