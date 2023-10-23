import {
  EsikatseleLausuntoPyynnonAineistotQueryVariables,
  EsikatseleLausuntoPyynnonTaydennysAineistotQueryVariables,
  LisaAineistot,
  ListaaLausuntoPyynnonAineistotQueryVariables,
  ListaaLausuntoPyynnonTaydennyksenAineistotQueryVariables,
  ListaaLisaAineistoQueryVariables,
} from "hassu-common/graphql/apiModel";
import { log } from "../logger";
import { projektiDatabase } from "../database/projektiDatabase";
import { NotFoundError } from "hassu-common/error";
import { lisaAineistoService } from "../aineisto/lisaAineistoService";

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

  async listaaLausuntoPyynnonAineistot({
    oid,
    lausuntoPyyntoAineistonTiedot: params,
  }: ListaaLausuntoPyynnonAineistotQueryVariables): Promise<LisaAineistot> {
    log.info("Loading projekti", { oid });
    if (!params) {
      throw new Error("params ei annettu (listaaLausuntoPyynnonAineistot)");
    }
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      // projekti.salt on määritelty
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      lisaAineistoService.validateHash(oid, projekti.salt, params);
      return lisaAineistoService.listaaLausuntoPyyntoAineisto(projekti, params);
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  }

  async listaaLausuntoPyynnonTaydennysAineistot({
    oid,
    lausuntoPyynnonTaydennyksenAineistonTiedot: params,
  }: ListaaLausuntoPyynnonTaydennyksenAineistotQueryVariables): Promise<LisaAineistot> {
    log.info("Loading projekti", { oid });
    if (!params) {
      throw new Error("params ei annettu (listaaLausuntoPyynnonTaydennysAineistot)");
    }
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      // projekti.salt on määritelty
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      lisaAineistoService.validateHash(oid, projekti.salt, params);
      return lisaAineistoService.listaaLausuntoPyynnonTaydennyksenAineisto(projekti, params);
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  }

  async esikatseleLausuntoPyynnonAineistot({
    oid,
    lausuntoPyynto,
  }: EsikatseleLausuntoPyynnonAineistotQueryVariables): Promise<LisaAineistot> {
    log.info("Loading projekti", { oid });
    if (!lausuntoPyynto) {
      throw new Error("lausuntoPyynto ei annettu (esikatseleLausuntoPyynnonAineistot)");
    }
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      return lisaAineistoService.esikatseleLausuntoPyynnonAineistot(projekti, lausuntoPyynto);
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  }

  async esikatseleLausuntoPyynnonTaydennysAineistot({
    oid,
    lausuntoPyynnonTaydennys,
  }: EsikatseleLausuntoPyynnonTaydennysAineistotQueryVariables): Promise<LisaAineistot> {
    log.info("Loading projekti", { oid });
    if (!lausuntoPyynnonTaydennys) {
      throw new Error("lausuntoPyynnonTaydennys ei annettu (esikatseleLausuntoPyynnonTaydennysAineistot)");
    }
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      return lisaAineistoService.esikatseleLausuntoPyynnonTaydennyksenAineistot(projekti, lausuntoPyynnonTaydennys);
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  }
}

export const lisaAineistoHandler = new LisaAineistoHandler();
