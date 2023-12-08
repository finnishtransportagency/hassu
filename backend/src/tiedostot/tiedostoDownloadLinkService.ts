import {
  AineistoTila,
  LausuntoPyynnonTaydennysInput,
  LausuntoPyyntoInput,
  LadattavaTiedosto,
  LadattavatTiedostot,
  ListaaLausuntoPyynnonTaydennyksenTiedostotInput,
  ListaaLausuntoPyyntoTiedostotInput,
} from "hassu-common/graphql/apiModel";
import { aineistoEiOdotaPoistoaTaiPoistettu, ladattuTiedostoEiOdotaPoistoaTaiPoistettu } from "hassu-common/util/tiedostoTilaUtil";
import crypto from "crypto";
import { IllegalAccessError } from "hassu-common/error";
import { Aineisto, DBProjekti, LadattuTiedosto, LausuntoPyynnonTaydennys, LausuntoPyynto } from "../database/model";
import { log } from "../logger";
import {
  findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu,
  findLausuntoPyynnonTaydennysByUuid,
  findLausuntoPyyntoByUuid,
} from "../util/lausuntoPyyntoUtil";
import { adaptLausuntoPyynnonTaydennysToSave, adaptLausuntoPyyntoToSave } from "../projekti/adapter/adaptToDB/adaptLausuntoPyynnotToSave";
import { ProjektiAdaptationResult } from "../projekti/adapter/projektiAdaptationResult";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";
import { fileService } from "../files/fileService";

class TiedostoDownloadLinkService {
  private async adaptAineistoToLadattavaTiedosto(oid: string, aineisto: Aineisto): Promise<LadattavaTiedosto> {
    const { jarjestys, kategoriaId } = aineisto;
    const nimi = aineisto.nimi;
    let linkki;
    if (aineisto.tila == AineistoTila.VALMIS) {
      if (!aineisto.tiedosto) {
        const msg = `Virhe tiedostojen listaamisessa: Aineistolta (nimi: ${nimi}, dokumenttiOid: ${aineisto.dokumenttiOid}) puuttuu tiedosto!`;
        log.error(msg, { aineisto });
        throw new Error(msg);
      }
      linkki = await fileService.createYllapitoSignedDownloadLink(oid, aineisto.tiedosto);
    } else {
      linkki = "";
    }
    return { __typename: "LadattavaTiedosto", nimi, jarjestys, kategoriaId, linkki, tuotu: aineisto.tuotu };
  }

  private async adaptLadattuTiedostoToLadattavaTiedosto(oid: string, tiedosto: LadattuTiedosto): Promise<LadattavaTiedosto> {
    const { jarjestys } = tiedosto;
    const nimi: string = tiedosto.nimi || "";
    let linkki;
    if (tiedosto.tuotu) {
      linkki = await fileService.createYllapitoSignedDownloadLink(oid, tiedosto.tiedosto);
    } else {
      linkki = "";
    }
    return { __typename: "LadattavaTiedosto", nimi, jarjestys, linkki, tuotu: tiedosto.tuotu };
  }

  async esikatseleLausuntoPyynnonTiedostot(projekti: DBProjekti, lausuntoPyyntoInput: LausuntoPyyntoInput): Promise<LadattavatTiedostot> {
    const nahtavillaolo = findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu(projekti);
    const lausuntoPyynto = findLausuntoPyyntoByUuid(projekti, lausuntoPyyntoInput.uuid);
    const uusiLausuntoPyynto = adaptLausuntoPyyntoToSave(lausuntoPyynto, lausuntoPyyntoInput, new ProjektiAdaptationResult(projekti));
    const aineistot =
      (
        await Promise.all(
          nahtavillaolo?.aineistoNahtavilla
            ?.filter(aineistoEiOdotaPoistoaTaiPoistettu)
            .map((aineisto) => this.adaptAineistoToLadattavaTiedosto(projekti.oid, aineisto)) || []
        )
      ).sort(jarjestaTiedostot) || [];
    const lisaAineistot =
      (
        await Promise.all(
          uusiLausuntoPyynto?.lisaAineistot
            ?.filter(ladattuTiedostoEiOdotaPoistoaTaiPoistettu)
            .map((aineisto) => this.adaptLadattuTiedostoToLadattavaTiedosto(projekti.oid, aineisto)) || []
        )
      ).sort(jarjestaTiedostot) || [];
    const aineistopaketti = "(esikatselu)";
    return {
      __typename: "LadattavatTiedostot",
      aineistot,
      lisaAineistot,
      poistumisPaiva: lausuntoPyyntoInput.poistumisPaiva,
      aineistopaketti,
    };
  }

  async esikatseleLausuntoPyynnonTaydennyksenTiedostot(
    projekti: DBProjekti,
    lausuntoPyynnonTaydennysInput: LausuntoPyynnonTaydennysInput
  ): Promise<LadattavatTiedostot> {
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
            .map((aineisto) => this.adaptLadattuTiedostoToLadattavaTiedosto(projekti.oid, aineisto)) || []
        )
      ).sort(jarjestaTiedostot) || [];
    const muistutukset =
      (
        await Promise.all(
          uusiLausuntoPyynnonTaydennys?.muistutukset
            ?.filter(ladattuTiedostoEiOdotaPoistoaTaiPoistettu)
            .map((aineisto) => this.adaptLadattuTiedostoToLadattavaTiedosto(projekti.oid, aineisto)) || []
        )
      ).sort(jarjestaTiedostot) || [];
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

  async listaaLausuntoPyyntoTiedostot(projekti: DBProjekti, params: ListaaLausuntoPyyntoTiedostotInput): Promise<LadattavatTiedostot> {
    const nahtavillaolo = findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu(projekti);
    const lausuntoPyynto = findLausuntoPyyntoByUuid(projekti, params.lausuntoPyyntoUuid);
    if (!lausuntoPyynto) {
      throw new Error("Lausuntopyyntöä ei löytynyt");
    }

    const aineistot =
      (
        await Promise.all(
          nahtavillaolo?.aineistoNahtavilla?.map((aineisto) => this.adaptAineistoToLadattavaTiedosto(projekti.oid, aineisto)) || []
        )
      ).sort(jarjestaTiedostot) || [];
    const lisaAineistot =
      (
        await Promise.all(
          lausuntoPyynto?.lisaAineistot?.map((aineisto) => this.adaptLadattuTiedostoToLadattavaTiedosto(projekti.oid, aineisto)) || []
        )
      ).sort(jarjestaTiedostot) || [];
    const aineistopaketti = lausuntoPyynto?.aineistopaketti
      ? await fileService.createYllapitoSignedDownloadLink(projekti.oid, lausuntoPyynto?.aineistopaketti)
      : null;
    return { __typename: "LadattavatTiedostot", aineistot, lisaAineistot, poistumisPaiva: lausuntoPyynto.poistumisPaiva, aineistopaketti };
  }

  async listaaLausuntoPyynnonTaydennyksenTiedostot(
    projekti: DBProjekti,
    params: ListaaLausuntoPyynnonTaydennyksenTiedostotInput
  ): Promise<LadattavatTiedostot> {
    const lausuntoPyynnonTaydennys = findLausuntoPyynnonTaydennysByUuid(projekti, params.lausuntoPyynnonTaydennysUuid);
    if (!lausuntoPyynnonTaydennys) {
      throw new Error("LausuntoPyynnonTaydennystä ei löytynyt");
    }

    const muutAineistot =
      (
        await Promise.all(
          lausuntoPyynnonTaydennys?.muuAineisto
            ?.filter(ladattuTiedostoEiOdotaPoistoaTaiPoistettu)
            .map((aineisto) => this.adaptLadattuTiedostoToLadattavaTiedosto(projekti.oid, aineisto)) || []
        )
      ).sort(jarjestaTiedostot) || [];
    const muistutukset =
      (
        await Promise.all(
          lausuntoPyynnonTaydennys?.muistutukset
            ?.filter(ladattuTiedostoEiOdotaPoistoaTaiPoistettu)
            .map((tiedosto) => this.adaptLadattuTiedostoToLadattavaTiedosto(projekti.oid, tiedosto)) || []
        )
      ).sort(jarjestaTiedostot) || [];
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

  generateHashForLausuntoPyynto(oid: string, uuid: string, salt: string): string {
    if (!salt) {
      // Should not happen after going to production because salt is generated in the first save to DB
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return;
    }
    return TiedostoDownloadLinkService.createLausuntoPyyntoHash(oid, uuid, salt);
  }

  generateHashForLausuntoPyynnonTaydennys(oid: string, uuid: string, salt: string): string {
    if (!salt) {
      // Should not happen after going to production because salt is generated in the first save to DB
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return;
    }
    return TiedostoDownloadLinkService.createLausuntoPyynnonTaydennysHash(oid, uuid, salt);
  }

  generateSalt() {
    return crypto.randomBytes(16).toString("hex");
  }

  validateLausuntoPyyntoHash(oid: string, salt: string, givenHash: string, lausuntoPyynto: LausuntoPyynto) {
    const hash = TiedostoDownloadLinkService.createLausuntoPyyntoHash(oid, lausuntoPyynto.uuid, salt);
    if (hash != givenHash) {
      log.error("Lausuntopyynnon aineiston tarkistussumma ei täsmää", { oid, salt, givenHash });
      throw new IllegalAccessError("Lausuntopyynnon aineiston tarkistussumma ei täsmää");
    }
  }

  validateLausuntoPyynnonTaydennysHash(oid: string, salt: string, givenHash: string, lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys) {
    const hash = TiedostoDownloadLinkService.createLausuntoPyynnonTaydennysHash(oid, lausuntoPyynnonTaydennys.uuid, salt);
    if (hash != givenHash) {
      log.error("Lausuntopyynnon täydennyksen aineiston tarkistussumma ei täsmää", { oid, salt, givenHash });
      throw new IllegalAccessError("Lausuntopyynnon täydennyksen aineiston tarkistussumma ei täsmää");
    }
  }

  private static createLausuntoPyyntoHash(oid: string, uuid: string, salt: string | undefined): string {
    if (!salt) {
      throw new Error("Salt missing");
    }
    return crypto.createHash("sha512").update([oid, "lausuntopyynto", uuid, salt].join()).digest("hex");
  }

  private static createLausuntoPyynnonTaydennysHash(oid: string, uuid: string, salt: string | undefined): string {
    if (!salt) {
      throw new Error("Salt missing");
    }
    const hash = crypto.createHash("sha512").update([oid, "lausuntopyynnon taydennys", uuid, salt].join()).digest("hex");
    return hash;
  }
}

export const tiedostoDownloadLinkService = new TiedostoDownloadLinkService();
