import * as API from "hassu-common/graphql/apiModel";
import { aineistoEiOdotaPoistoaTaiPoistettu, ladattuTiedostoEiOdotaPoistoaTaiPoistettu } from "hassu-common/util/tiedostoTilaUtil";
import crypto from "crypto";
import { IllegalAccessError } from "hassu-common/error";
import { DBProjekti, LausuntoPyynto, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../../database/model";
import { log } from "../../logger";
import { findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu, findLausuntoPyyntoByUuid } from "../../util/lausuntoPyyntoUtil";
import { adaptLausuntoPyyntoToSave } from "../../projekti/adapter/adaptToDB/adaptLausuntoPyynnotToSave";
import { ProjektiAdaptationResult } from "../../projekti/adapter/projektiAdaptationResult";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";
import { fileService } from "../../files/fileService";
import TiedostoDownloadLinkService from "./AbstractTiedostoDownloadLinkService";
import { adaptAineistoToLadattavaTiedosto, adaptLadattuTiedostoToLadattavaTiedosto } from "../adaptToLadattavaTiedosto";
import { isProjektiJulkinenStatusPublic } from "hassu-common/isProjektiJulkinenStatusPublic";
import { projektiAdapterJulkinen } from "../../projekti/adapter/projektiAdapterJulkinen";
import { assertIsDefined } from "../../util/assertions";

class LausuntoPyyntoDownloadLinkService extends TiedostoDownloadLinkService<
  API.LausuntoPyyntoInput,
  API.ListaaLausuntoPyyntoTiedostotInput
> {
  async esikatseleTiedostot(projekti: DBProjekti, lausuntoPyyntoInput: API.LausuntoPyyntoInput): Promise<API.LadattavatTiedostot> {
    assertIsDefined(projekti.velho?.nimi);
    const nahtavillaolo = findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu(projekti);
    const lausuntoPyynto = findLausuntoPyyntoByUuid(projekti, lausuntoPyyntoInput.uuid);
    const uusiLausuntoPyynto = adaptLausuntoPyyntoToSave(lausuntoPyynto, lausuntoPyyntoInput, new ProjektiAdaptationResult(projekti));
    const aineistot =
      (
        await Promise.all(
          nahtavillaolo?.aineistoNahtavilla
            ?.filter(aineistoEiOdotaPoistoaTaiPoistettu)
            .map((aineisto) => adaptAineistoToLadattavaTiedosto(projekti.oid, aineisto)) ?? []
        )
      ).sort(jarjestaTiedostot) ?? [];
    const lisaAineistot =
      (
        await Promise.all(
          uusiLausuntoPyynto?.lisaAineistot
            ?.filter(ladattuTiedostoEiOdotaPoistoaTaiPoistettu)
            .map((aineisto) => adaptLadattuTiedostoToLadattavaTiedosto(projekti.oid, aineisto)) ?? []
        )
      ).sort(jarjestaTiedostot) ?? [];
    const aineistopaketti = "(esikatselu)";
    const projektijulkinen = await projektiAdapterJulkinen.adaptProjekti(projekti);
    const julkinen = !!projektijulkinen?.status && isProjektiJulkinenStatusPublic(projektijulkinen.status);
    return {
      __typename: "LadattavatTiedostot",
      aineistot,
      lisaAineistot,
      poistumisPaiva: lausuntoPyyntoInput.poistumisPaiva,
      aineistopaketti,
      julkinen,
      nimi: projekti.velho.nimi,
      tyyppi: projekti.velho.tyyppi,
      projektiOid: projekti.oid,
    };
  }

  async listaaTiedostot(projekti: DBProjekti, params: API.ListaaLausuntoPyyntoTiedostotInput): Promise<API.LadattavatTiedostot> {
    assertIsDefined(projekti.velho?.nimi);
    const nahtavillaolo = findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu(projekti);
    const lausuntoPyynto = findLausuntoPyyntoByUuid(projekti, params.lausuntoPyyntoUuid);
    if (!lausuntoPyynto) {
      throw new Error("Lausuntopyyntöä ei löytynyt");
    }

    const aineistot =
      (
        await Promise.all(
          nahtavillaolo?.aineistoNahtavilla?.map((aineisto) => adaptAineistoToLadattavaTiedosto(projekti.oid, aineisto)) ?? []
        )
      ).sort(jarjestaTiedostot) ?? [];
    const lisaAineistot =
      (
        await Promise.all(
          lausuntoPyynto?.lisaAineistot?.map((aineisto) => adaptLadattuTiedostoToLadattavaTiedosto(projekti.oid, aineisto)) ?? []
        )
      ).sort(jarjestaTiedostot) ?? [];
    const aineistopaketti = lausuntoPyynto?.aineistopaketti
      ? await fileService.createYllapitoSignedDownloadLink(projekti.oid, lausuntoPyynto?.aineistopaketti)
      : null;
    const projektijulkinen = await projektiAdapterJulkinen.adaptProjekti(projekti);
    const julkinen = !!projektijulkinen?.status && isProjektiJulkinenStatusPublic(projektijulkinen.status);
    return {
      __typename: "LadattavatTiedostot",
      aineistot,
      lisaAineistot,
      poistumisPaiva: lausuntoPyynto.poistumisPaiva,
      aineistopaketti,
      julkinen,
      nimi: projekti.velho.nimi,
      tyyppi: projekti.velho.tyyppi,
      projektiOid: projekti.oid,
    };
  }

  async listaaLisaAineistoLegacy(projekti: DBProjekti, params: API.ListaaLisaAineistoInput): Promise<API.LadattavatTiedostot> {
    assertIsDefined(projekti.velho?.nimi);
    const nahtavillaolo = findNahtavillaoloVaiheById(projekti, params.nahtavillaoloVaiheId);
    const aineistot =
      (
        await Promise.all(
          nahtavillaolo?.aineistoNahtavilla?.map((aineisto) => adaptAineistoToLadattavaTiedosto(projekti.oid, aineisto)) ?? []
        )
      ).sort(jarjestaTiedostot) ?? [];
    const lausuntoPyynto = projekti.lausuntoPyynnot?.find((lp) => lp.legacy === params.nahtavillaoloVaiheId);
    const lisaAineistot =
      (
        await Promise.all(
          lausuntoPyynto?.lisaAineistot?.map((aineisto) => adaptLadattuTiedostoToLadattavaTiedosto(projekti.oid, aineisto)) ?? []
        )
      ).sort(jarjestaTiedostot) ?? [];
    const aineistopaketti = nahtavillaolo?.aineistopaketti
      ? await fileService.createYllapitoSignedDownloadLink(projekti.oid, nahtavillaolo?.aineistopaketti)
      : null;
    const projektijulkinen = await projektiAdapterJulkinen.adaptProjekti(projekti);
    const julkinen = !!projektijulkinen?.status && isProjektiJulkinenStatusPublic(projektijulkinen.status);
    return {
      __typename: "LadattavatTiedostot",
      aineistot,
      lisaAineistot,
      poistumisPaiva: params.poistumisPaiva,
      aineistopaketti,
      julkinen,
      nimi: projekti.velho.nimi,
      tyyppi: projekti.velho.tyyppi,
      projektiOid: projekti.oid,
    };
  }

  generateHash(oid: string, uuid: string, salt: string): string {
    if (!salt) {
      // Should not happen after going to production because salt is generated in the first save to DB
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return;
    }
    return LausuntoPyyntoDownloadLinkService.createLausuntoPyyntoHash(oid, uuid, salt);
  }

  validateHash(oid: string, salt: string, givenHash: string, lausuntoPyynto: LausuntoPyynto) {
    const hash = LausuntoPyyntoDownloadLinkService.createLausuntoPyyntoHash(oid, lausuntoPyynto.uuid, salt);
    if (hash != givenHash) {
      log.error("Lausuntopyynnon aineiston tarkistussumma ei täsmää", { oid, salt, givenHash });
      throw new IllegalAccessError("Lausuntopyynnon aineiston tarkistussumma ei täsmää");
    }
  }

  private static createLausuntoPyyntoHash(oid: string, uuid: string, salt: string | undefined): string {
    if (!salt) {
      throw new Error("Salt missing");
    }
    return crypto.createHash("sha512").update([oid, "lausuntopyynto", uuid, salt].join()).digest("hex");
  }
}

export const lausuntoPyyntoDownloadLinkService = new LausuntoPyyntoDownloadLinkService();

function findNahtavillaoloVaiheById(
  projekti: DBProjekti,
  nahtavillaoloVaiheId: number
): NahtavillaoloVaiheJulkaisu | NahtavillaoloVaihe | undefined {
  let lista: (NahtavillaoloVaiheJulkaisu | NahtavillaoloVaihe | undefined)[] = [];
  if (projekti.nahtavillaoloVaiheJulkaisut) {
    lista = lista.concat(projekti.nahtavillaoloVaiheJulkaisut);
  }
  if (projekti.nahtavillaoloVaihe) {
    lista = lista.concat(projekti.nahtavillaoloVaihe);
  }
  lista = lista.filter((nahtavillaolo) => nahtavillaolo?.id == nahtavillaoloVaiheId);
  return lista.pop();
}
