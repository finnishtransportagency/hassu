import * as API from "hassu-common/graphql/apiModel";

import { ladattuTiedostoEiOdotaPoistoaTaiPoistettu } from "hassu-common/util/tiedostoTilaUtil";
import crypto from "crypto";
import { IllegalAccessError } from "hassu-common/error";
import { DBProjekti, LausuntoPyynnonTaydennys } from "../../database/model";
import { log } from "../../logger";
import { findLausuntoPyynnonTaydennysByUuid } from "../../util/lausuntoPyyntoUtil";
import { adaptLausuntoPyynnonTaydennysToSave } from "../../projekti/adapter/adaptToDB/adaptLausuntoPyynnotToSave";
import { ProjektiAdaptationResult } from "../../projekti/adapter/projektiAdaptationResult";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";
import { fileService } from "../../files/fileService";
import TiedostoDownloadLinkService, { adaptLadattuTiedostoToLadattavaTiedosto } from "./AbstractTiedostoDownloadLinkService";

class LausuntoPyynnonTaydennysDownloadLinkService extends TiedostoDownloadLinkService<
  API.LausuntoPyynnonTaydennysInput,
  API.ListaaLausuntoPyynnonTaydennyksenTiedostotInput
> {
  async esikatseleTiedostot(
    projekti: DBProjekti,
    lausuntoPyynnonTaydennysInput: API.LausuntoPyynnonTaydennysInput
  ): Promise<API.LadattavatTiedostot> {
    const lausuntoPyynnonTaydennys = findLausuntoPyynnonTaydennysByUuid(projekti, lausuntoPyynnonTaydennysInput.uuid);
    const uusiLausuntoPyynnonTaydennys = adaptLausuntoPyynnonTaydennysToSave(
      lausuntoPyynnonTaydennys,
      lausuntoPyynnonTaydennysInput,
      new ProjektiAdaptationResult(projekti)
    );
    const muutAineistot =
      (
        await Promise.all(
          uusiLausuntoPyynnonTaydennys?.muuAineisto
            ?.filter(ladattuTiedostoEiOdotaPoistoaTaiPoistettu)
            .map((aineisto) => adaptLadattuTiedostoToLadattavaTiedosto(projekti.oid, aineisto)) ?? []
        )
      ).sort(jarjestaTiedostot) ?? [];
    const muistutukset =
      (
        await Promise.all(
          uusiLausuntoPyynnonTaydennys?.muistutukset
            ?.filter(ladattuTiedostoEiOdotaPoistoaTaiPoistettu)
            .map((aineisto) => adaptLadattuTiedostoToLadattavaTiedosto(projekti.oid, aineisto)) ?? []
        )
      ).sort(jarjestaTiedostot) ?? [];
    const aineistopaketti = "(esikatselu)";
    return {
      __typename: "LadattavatTiedostot",
      kunta: uusiLausuntoPyynnonTaydennys?.kunta,
      muutAineistot,
      muistutukset,
      poistumisPaiva: lausuntoPyynnonTaydennysInput.poistumisPaiva,
      aineistopaketti,
    };
  }

  async listaaTiedostot(
    projekti: DBProjekti,
    params: API.ListaaLausuntoPyynnonTaydennyksenTiedostotInput
  ): Promise<API.LadattavatTiedostot> {
    const lausuntoPyynnonTaydennys = findLausuntoPyynnonTaydennysByUuid(projekti, params.lausuntoPyynnonTaydennysUuid);
    if (!lausuntoPyynnonTaydennys) {
      throw new Error("LausuntoPyynnonTaydennystä ei löytynyt");
    }

    const muutAineistot =
      (
        await Promise.all(
          lausuntoPyynnonTaydennys?.muuAineisto
            ?.filter(ladattuTiedostoEiOdotaPoistoaTaiPoistettu)
            .map((aineisto) => adaptLadattuTiedostoToLadattavaTiedosto(projekti.oid, aineisto)) ?? []
        )
      ).sort(jarjestaTiedostot) ?? [];
    const muistutukset =
      (
        await Promise.all(
          lausuntoPyynnonTaydennys?.muistutukset
            ?.filter(ladattuTiedostoEiOdotaPoistoaTaiPoistettu)
            .map((tiedosto) => adaptLadattuTiedostoToLadattavaTiedosto(projekti.oid, tiedosto)) ?? []
        )
      ).sort(jarjestaTiedostot) ?? [];
    const aineistopaketti = lausuntoPyynnonTaydennys?.aineistopaketti
      ? await fileService.createYllapitoSignedDownloadLink(projekti.oid, lausuntoPyynnonTaydennys?.aineistopaketti)
      : null;
    return {
      __typename: "LadattavatTiedostot",
      kunta: lausuntoPyynnonTaydennys.kunta,
      muutAineistot,
      muistutukset,
      poistumisPaiva: lausuntoPyynnonTaydennys.poistumisPaiva,
      aineistopaketti,
    };
  }

  generateHash(oid: string, uuid: string, salt: string): string {
    if (!salt) {
      // Should not happen after going to production because salt is generated in the first save to DB
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return;
    }
    return LausuntoPyynnonTaydennysDownloadLinkService.createLausuntoPyynnonTaydennysHash(oid, uuid, salt);
  }

  validateHash(oid: string, salt: string, givenHash: string, lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys) {
    const hash = LausuntoPyynnonTaydennysDownloadLinkService.createLausuntoPyynnonTaydennysHash(oid, lausuntoPyynnonTaydennys.uuid, salt);
    if (hash != givenHash) {
      log.error("Lausuntopyynnon täydennyksen aineiston tarkistussumma ei täsmää", { oid, salt, givenHash });
      throw new IllegalAccessError("Lausuntopyynnon täydennyksen aineiston tarkistussumma ei täsmää");
    }
  }

  private static createLausuntoPyynnonTaydennysHash(oid: string, uuid: string, salt: string | undefined): string {
    if (!salt) {
      throw new Error("Salt missing");
    }
    const hash = crypto.createHash("sha512").update([oid, "lausuntopyynnon taydennys", uuid, salt].join()).digest("hex");
    return hash;
  }
}

export const lausuntoPyynnonTaydennysDownloadLinkService = new LausuntoPyynnonTaydennysDownloadLinkService();
