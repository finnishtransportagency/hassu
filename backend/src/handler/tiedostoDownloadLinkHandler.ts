import {
  EsikatseleLausuntoPyynnonTiedostotQueryVariables,
  EsikatseleLausuntoPyynnonTaydennysTiedostotQueryVariables,
  LadattavatTiedostot,
  ListaaLausuntoPyynnonTiedostotQueryVariables,
  ListaaLausuntoPyynnonTaydennyksenTiedostotQueryVariables,
} from "hassu-common/graphql/apiModel";
import { projektiDatabase } from "../database/projektiDatabase";
import { log } from "../logger";
import { findLausuntoPyynnonTaydennysByUuid, findLausuntoPyyntoByUuid } from "../util/lausuntoPyyntoUtil";
import { NotFoundError } from "hassu-common/error";
import { nyt, parseDate } from "../util/dateUtil";
import { tiedostoDownloadLinkService } from "../tiedostot/tiedostoDownloadLinkService";

class TiedostoDownloadLinkHandler {
  async listaaLausuntoPyynnonTiedostot({
    oid,
    listaaLausuntoPyyntoTiedostotInput: params,
  }: ListaaLausuntoPyynnonTiedostotQueryVariables): Promise<LadattavatTiedostot> {
    log.info("Loading projekti", { oid });
    if (!params) {
      throw new Error("params ei annettu (listaaLausuntoPyynnonTiedostot)");
    }
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      const lausuntoPyynto = findLausuntoPyyntoByUuid(projekti, params.lausuntoPyyntoUuid);
      if (!lausuntoPyynto) {
        throw new NotFoundError("Lausuntopyynnon aineiston linkki on vanhentunut");
      }
      // projekti.salt on määritelty
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      tiedostoDownloadLinkService.validateLausuntoPyyntoHash(oid, projekti.salt, params.hash, lausuntoPyynto);

      const poistumisPaivaEndOfTheDay = parseDate(lausuntoPyynto.poistumisPaiva).endOf("day");
      if (poistumisPaivaEndOfTheDay.isBefore(nyt())) {
        throw new NotFoundError("Lausuntopyynnon aineiston linkki on vanhentunut");
      }
      return tiedostoDownloadLinkService.listaaLausuntoPyyntoTiedostot(projekti, params);
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  }

  async listaaLausuntoPyynnonTaydennysTiedostot({
    oid,
    listaaLausuntoPyynnonTaydennyksenTiedostotInput: params,
  }: ListaaLausuntoPyynnonTaydennyksenTiedostotQueryVariables): Promise<LadattavatTiedostot> {
    log.info("Loading projekti", { oid });
    if (!params) {
      throw new Error("params ei annettu (listaaLausuntoPyynnonTaydennysTiedostot)");
    }
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      const lausuntoPyynnonTaydennys = findLausuntoPyynnonTaydennysByUuid(projekti, params.lausuntoPyynnonTaydennysUuid);
      if (!lausuntoPyynnonTaydennys) {
        throw new NotFoundError("Lausuntopyynnon täydennysaineiston linkki on vanhentunut");
      }
      // projekti.salt on määritelty
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      tiedostoDownloadLinkService.validateLausuntoPyynnonTaydennysHash(oid, projekti.salt, params.hash, lausuntoPyynnonTaydennys);
      const poistumisPaivaEndOfTheDay = parseDate(lausuntoPyynnonTaydennys.poistumisPaiva).endOf("day");
      if (poistumisPaivaEndOfTheDay.isBefore(nyt())) {
        throw new NotFoundError("Lausuntopyynnon täydennysaineiston linkki on vanhentunut");
      }
      return tiedostoDownloadLinkService.listaaLausuntoPyynnonTaydennyksenTiedostot(projekti, params);
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  }

  async esikatseleLausuntoPyynnonTiedostot({
    oid,
    lausuntoPyynto,
  }: EsikatseleLausuntoPyynnonTiedostotQueryVariables): Promise<LadattavatTiedostot> {
    log.info("Loading projekti", { oid });
    if (!lausuntoPyynto) {
      throw new Error("lausuntoPyynto ei annettu (esikatseleLausuntoPyynnonTiedostot)");
    }
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      return tiedostoDownloadLinkService.esikatseleLausuntoPyynnonTiedostot(projekti, lausuntoPyynto);
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  }

  async esikatseleLausuntoPyynnonTaydennysTiedostot({
    oid,
    lausuntoPyynnonTaydennys,
  }: EsikatseleLausuntoPyynnonTaydennysTiedostotQueryVariables): Promise<LadattavatTiedostot> {
    log.info("Loading projekti", { oid });
    if (!lausuntoPyynnonTaydennys) {
      throw new Error("lausuntoPyynnonTaydennys ei annettu (esikatseleLausuntoPyynnonTaydennysTiedostot)");
    }
    const projekti = await projektiDatabase.loadProjektiByOid(oid);
    if (projekti) {
      return tiedostoDownloadLinkService.esikatseleLausuntoPyynnonTaydennyksenTiedostot(projekti, lausuntoPyynnonTaydennys);
    } else {
      throw new NotFoundError(`Projektia ${oid} ei löydy`);
    }
  }
}

export const tiedostoDownloadLinkHandler = new TiedostoDownloadLinkHandler();
