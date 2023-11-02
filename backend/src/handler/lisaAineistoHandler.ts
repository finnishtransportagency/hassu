import { LisaAineistot, ListaaLisaAineistoQueryVariables } from "hassu-common/graphql/apiModel";
import { log } from "../logger";
import { projektiDatabase } from "../database/projektiDatabase";
import { NotFoundError } from "hassu-common/error";
import { lisaAineistoService } from "../tiedostot/lisaAineistoService";

class LisaAineistoHandler {
  async listaaLisaAineisto({ oid: oid, lisaAineistoTiedot: params }: ListaaLisaAineistoQueryVariables): Promise<LisaAineistot> {
    log.info("Loading projekti", { oid });
    if (!params) {
      throw new Error("params ei annettu (listaaLisaAineisto)");
    }
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      // projekti.salt on määritelty
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      lisaAineistoService.validateHash(oid, projekti.salt, params);
      return lisaAineistoService.listaaLisaAineisto(projekti, params);
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  }
}

export const lisaAineistoHandler = new LisaAineistoHandler();
