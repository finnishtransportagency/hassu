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
import dayjs from "dayjs";
import { nyt } from "../util/dateUtil";
import { findLausuntoPyynnonTaydennysByKunta, findLausuntoPyyntoById } from "../util/lausuntoPyyntoUtil";

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
      const lausuntoPyynto = findLausuntoPyyntoById(projekti, params.lausuntoPyyntoId);
      if (!lausuntoPyynto) {
        throw new NotFoundError("Lausuntopyynnon aineiston linkki on vanhentunut");
      }
      // projekti.salt on määritelty
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      lisaAineistoService.validateLausuntoPyyntoHash(oid, projekti.salt, params.hash, lausuntoPyynto);

      const poistumisPaivaEndOfTheDay = dayjs(lausuntoPyynto.poistumisPaiva).endOf("day");
      if (poistumisPaivaEndOfTheDay.isBefore(nyt())) {
        throw new NotFoundError("Lausuntopyynnon aineiston linkki on vanhentunut");
      }
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
      const lausuntoPyynnonTaydennys = findLausuntoPyynnonTaydennysByKunta(projekti, params.kunta);
      if (!lausuntoPyynnonTaydennys) {
        throw new NotFoundError("Lausuntopyynnon täydennysaineiston linkki on vanhentunut");
      }
      // projekti.salt on määritelty
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      lisaAineistoService.validateLausuntoPyynnonTaydennysHash(oid, projekti.salt, params.hash, lausuntoPyynnonTaydennys);
      const poistumisPaivaEndOfTheDay = dayjs(lausuntoPyynnonTaydennys.poistumisPaiva).endOf("day");
      if (poistumisPaivaEndOfTheDay.isBefore(nyt())) {
        throw new NotFoundError("Lausuntopyynnon täydennysaineiston linkki on vanhentunut");
      }
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
