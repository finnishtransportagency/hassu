import {
  AineistoTila,
  LausuntoPyynnonTaydennysInput,
  LausuntoPyyntoInput,
  LisaAineisto,
  LisaAineistoParametrit,
  LisaAineistot,
  ListaaLausuntoPyynnonTaydennyksenAineistotInput,
  ListaaLausuntoPyyntoAineistotInput,
  ListaaLisaAineistoInput,
} from "hassu-common/graphql/apiModel";

import crypto from "crypto";
import dayjs from "dayjs";
import { IllegalAccessError, NotFoundError } from "hassu-common/error";
import {
  Aineisto,
  DBProjekti,
  LausuntoPyynnonTaydennys,
  LausuntoPyynto,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
} from "../database/model";
import { fileService } from "../files/fileService";
import { log } from "../logger";
import { nyt } from "../util/dateUtil";
import { jarjestaAineistot } from "hassu-common/util/jarjestaAineistot";
import { adaptLausuntoPyynnonTaydennysToSave, adaptLausuntoPyyntoToSave } from "../projekti/adapter/adaptToDB";
import { ProjektiAdaptationResult } from "../projekti/adapter/projektiAdaptationResult";
import {
  findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu,
  findLausuntoPyynnonTaydennysByUuid,
  findLausuntoPyyntoByUuid,
} from "../util/lausuntoPyyntoUtil";

class LisaAineistoService {
  async listaaLisaAineisto(projekti: DBProjekti, params: ListaaLisaAineistoInput): Promise<LisaAineistot> {
    const nahtavillaolo = findNahtavillaoloVaiheById(projekti, params.nahtavillaoloVaiheId);

    async function adaptLisaAineisto(aineisto: Aineisto): Promise<LisaAineisto> {
      const { jarjestys, kategoriaId } = aineisto;
      let nimi = aineisto.nimi;
      let linkki;
      if (aineisto.tila == AineistoTila.VALMIS) {
        if (!aineisto.tiedosto) {
          const msg = `Virhe lisäaineiston listaamisessa: Aineistolta (nimi: ${nimi}, dokumenttiOid: ${aineisto.dokumenttiOid}) puuttuu tiedosto!`;
          log.error(msg, { aineisto });
          throw new Error(msg);
        }
        linkki = await fileService.createYllapitoSignedDownloadLink(projekti.oid, aineisto.tiedosto);
      } else {
        nimi = nimi + " (odottaa tuontia)";
        linkki = "";
      }
      return { __typename: "LisaAineisto", nimi, jarjestys, kategoriaId, linkki };
    }

    const aineistot = (await Promise.all(nahtavillaolo?.aineistoNahtavilla?.map(adaptLisaAineisto) || [])).sort(jarjestaAineistot) || [];
    const lisaAineistot = (await Promise.all(nahtavillaolo?.lisaAineisto?.map(adaptLisaAineisto) || [])).sort(jarjestaAineistot) || [];
    const aineistopaketti = nahtavillaolo?.aineistopaketti
      ? await fileService.createYllapitoSignedDownloadLink(projekti.oid, nahtavillaolo?.aineistopaketti)
      : null;
    return { __typename: "LisaAineistot", aineistot, lisaAineistot, poistumisPaiva: params.poistumisPaiva, aineistopaketti };
  }

  async esikatseleLausuntoPyynnonAineistot(projekti: DBProjekti, lausuntoPyyntoInput: LausuntoPyyntoInput): Promise<LisaAineistot> {
    const nahtavillaolo = findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu(projekti);
    const lausuntoPyynto = findLausuntoPyyntoByUuid(projekti, lausuntoPyyntoInput.uuid);
    const uusiLausuntoPyynto = adaptLausuntoPyyntoToSave(lausuntoPyynto, lausuntoPyyntoInput, new ProjektiAdaptationResult(projekti));
    function adaptLisaAineisto(aineisto: Aineisto): LisaAineisto {
      const { jarjestys, kategoriaId } = aineisto;
      const nimi = aineisto.nimi;
      const linkki = "(esikatselu)";
      return { __typename: "LisaAineisto", nimi, jarjestys, kategoriaId, linkki };
    }
    const aineistot = (nahtavillaolo?.aineistoNahtavilla?.map(adaptLisaAineisto) || []).sort(jarjestaAineistot) || [];
    const lisaAineistot =
      (await Promise.all(uusiLausuntoPyynto?.lisaAineistot?.map(adaptLisaAineisto) || [])).sort(jarjestaAineistot) || [];
    const aineistopaketti = "(esikatselu)";
    return { __typename: "LisaAineistot", aineistot, lisaAineistot, poistumisPaiva: lausuntoPyyntoInput.poistumisPaiva, aineistopaketti };
  }

  async esikatseleLausuntoPyynnonTaydennyksenAineistot(
    projekti: DBProjekti,
    lausuntoPyynnonTaydennysInput: LausuntoPyynnonTaydennysInput
  ): Promise<LisaAineistot> {
    const lausuntoPyynnonTaydennys = findLausuntoPyynnonTaydennysByUuid(projekti, lausuntoPyynnonTaydennysInput.uuid);
    const uusiLausuntoPyynnonTaydennys = adaptLausuntoPyynnonTaydennysToSave(
      lausuntoPyynnonTaydennys,
      lausuntoPyynnonTaydennysInput,
      new ProjektiAdaptationResult(projekti)
    );
    function adaptLisaAineisto(aineisto: Aineisto): LisaAineisto {
      const { jarjestys, kategoriaId } = aineisto;
      const nimi = aineisto.nimi;
      const linkki = "(esikatselu)";
      return { __typename: "LisaAineisto", nimi, jarjestys, kategoriaId, linkki };
    }
    const muutAineistot = (uusiLausuntoPyynnonTaydennys?.muuAineisto?.map(adaptLisaAineisto) || []).sort(jarjestaAineistot) || [];
    const muistutukset = (uusiLausuntoPyynnonTaydennys?.muistutukset?.map(adaptLisaAineisto) || []).sort(jarjestaAineistot) || [];
    const aineistopaketti = "(esikatselu)";
    return {
      __typename: "LisaAineistot",
      muutAineistot,
      muistutukset,
      poistumisPaiva: lausuntoPyynnonTaydennysInput.poistumisPaiva,
      aineistopaketti,
    };
  }

  async listaaLausuntoPyyntoAineisto(projekti: DBProjekti, params: ListaaLausuntoPyyntoAineistotInput): Promise<LisaAineistot> {
    const nahtavillaolo = findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu(projekti);
    const lausuntoPyynto = findLausuntoPyyntoByUuid(projekti, params.lausuntoPyyntoUuid);
    if (!lausuntoPyynto) {
      throw new Error("Lausuntopyyntöä ei löytynyt");
    }

    async function adaptLisaAineisto(aineisto: Aineisto): Promise<LisaAineisto> {
      const { jarjestys, kategoriaId } = aineisto;
      let nimi = aineisto.nimi;
      let linkki;
      if (aineisto.tila == AineistoTila.VALMIS) {
        if (!aineisto.tiedosto) {
          const msg = `Virhe lisäaineiston listaamisessa: Aineistolta (nimi: ${nimi}, dokumenttiOid: ${aineisto.dokumenttiOid}) puuttuu tiedosto!`;
          log.error(msg, { aineisto });
          throw new Error(msg);
        }
        linkki = await fileService.createYllapitoSignedDownloadLink(projekti.oid, aineisto.tiedosto);
      } else {
        nimi = nimi + " (odottaa tuontia)";
        linkki = "";
      }
      return { __typename: "LisaAineisto", nimi, jarjestys, kategoriaId, linkki };
    }

    const aineistot = (await Promise.all(nahtavillaolo?.aineistoNahtavilla?.map(adaptLisaAineisto) || [])).sort(jarjestaAineistot) || [];
    const lisaAineistot = (await Promise.all(lausuntoPyynto?.lisaAineistot?.map(adaptLisaAineisto) || [])).sort(jarjestaAineistot) || [];
    const aineistopaketti = lausuntoPyynto?.aineistopaketti
      ? await fileService.createYllapitoSignedDownloadLink(projekti.oid, lausuntoPyynto?.aineistopaketti)
      : null;
    return { __typename: "LisaAineistot", aineistot, lisaAineistot, poistumisPaiva: lausuntoPyynto.poistumisPaiva, aineistopaketti };
  }

  async listaaLausuntoPyynnonTaydennyksenAineisto(
    projekti: DBProjekti,
    params: ListaaLausuntoPyynnonTaydennyksenAineistotInput
  ): Promise<LisaAineistot> {
    const lausuntoPyynnonTaydennys = findLausuntoPyynnonTaydennysByUuid(projekti, params.lausuntoPyynnonTaydennysUuid);
    if (!lausuntoPyynnonTaydennys) {
      throw new Error("LausuntoPyynnonTaydennystä ei löytynyt");
    }
    async function adaptLisaAineisto(aineisto: Aineisto): Promise<LisaAineisto> {
      const { jarjestys, kategoriaId } = aineisto;
      let nimi = aineisto.nimi;
      let linkki;
      if (aineisto.tila == AineistoTila.VALMIS) {
        if (!aineisto.tiedosto) {
          const msg = `Virhe lisäaineiston listaamisessa: Aineistolta (nimi: ${nimi}, dokumenttiOid: ${aineisto.dokumenttiOid}) puuttuu tiedosto!`;
          log.error(msg, { aineisto });
          throw new Error(msg);
        }
        linkki = await fileService.createYllapitoSignedDownloadLink(projekti.oid, aineisto.tiedosto);
      } else {
        nimi = nimi + " (odottaa tuontia)";
        linkki = "";
      }
      return { __typename: "LisaAineisto", nimi, jarjestys, kategoriaId, linkki };
    }

    const muutAineistot =
      (await Promise.all(lausuntoPyynnonTaydennys?.muuAineisto?.map(adaptLisaAineisto) || [])).sort(jarjestaAineistot) || [];
    const muistutukset =
      (await Promise.all(lausuntoPyynnonTaydennys?.muistutukset?.map(adaptLisaAineisto) || [])).sort(jarjestaAineistot) || [];
    const aineistopaketti = lausuntoPyynnonTaydennys?.aineistopaketti
      ? await fileService.createYllapitoSignedDownloadLink(projekti.oid, lausuntoPyynnonTaydennys?.aineistopaketti)
      : null;
    return {
      __typename: "LisaAineistot",
      muutAineistot,
      muistutukset,
      poistumisPaiva: lausuntoPyynnonTaydennys.poistumisPaiva,
      aineistopaketti,
    };
  }

  generateListingParams(oid: string, nahtavillaoloVaiheId: number, salt: string): LisaAineistoParametrit {
    const expires = nyt().add(180, "day").format("YYYY-MM-DD");
    if (!salt) {
      // Should not happen after going to production because salt is generated in the first save to DB
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return;
    }
    const hash = LisaAineistoService.createHash(oid, { nahtavillaoloVaiheId, poistumisPaiva: expires }, salt);
    return {
      __typename: "LisaAineistoParametrit",
      nahtavillaoloVaiheId,
      poistumisPaiva: expires,
      hash,
    };
  }

  generateHashForLausuntoPyynto(oid: string, uuid: string, salt: string): string {
    if (!salt) {
      // Should not happen after going to production because salt is generated in the first save to DB
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return;
    }
    return LisaAineistoService.createLausuntoPyyntoHash(oid, uuid, salt);
  }

  generateHashForLausuntoPyynnonTaydennys(oid: string, uuid: string, salt: string): string {
    if (!salt) {
      // Should not happen after going to production because salt is generated in the first save to DB
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return;
    }
    return LisaAineistoService.createLausuntoPyyntoHash(oid, uuid, salt);
  }

  generateSalt() {
    return crypto.randomBytes(16).toString("hex");
  }

  validateHash(oid: string, salt: string, params: ListaaLisaAineistoInput) {
    const hash = LisaAineistoService.createHash(oid, params, salt);
    if (hash != params.hash) {
      log.error("Lisäaineiston tarkistussumma ei täsmää", { oid, params, salt, hash });
      throw new IllegalAccessError("Lisäaineiston tarkistussumma ei täsmää");
    }

    const poistumisPaivaEndOfTheDay = dayjs(params.poistumisPaiva).endOf("day");
    if (poistumisPaivaEndOfTheDay.isBefore(nyt())) {
      throw new NotFoundError("Lisäaineston linkki on vanhentunut");
    }
  }

  validateLausuntoPyyntoHash(oid: string, salt: string, givenHash: string, lausuntoPyynto: LausuntoPyynto) {
    const hash = LisaAineistoService.createLausuntoPyyntoHash(oid, lausuntoPyynto.uuid, salt);
    if (hash != givenHash) {
      log.error("Lausuntopyynnon aineiston tarkistussumma ei täsmää", { oid, salt, givenHash });
      throw new IllegalAccessError("Lausuntopyynnon aineiston tarkistussumma ei täsmää");
    }
  }

  validateLausuntoPyynnonTaydennysHash(oid: string, salt: string, givenHash: string, lausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys) {
    const hash = LisaAineistoService.createLausuntoPyynnonTaydennysHash(oid, lausuntoPyynnonTaydennys.uuid, salt);
    if (hash != givenHash) {
      log.error("Lausuntopyynnon täydennyksen aineiston tarkistussumma ei täsmää", { oid, salt, givenHash });
      throw new IllegalAccessError("Lausuntopyynnon täydennyksen aineiston tarkistussumma ei täsmää");
    }
  }

  private static createHash(oid: string, params: Omit<ListaaLisaAineistoInput, "hash">, salt: string | undefined): string {
    if (!salt) {
      throw new Error("Salt missing");
    }
    return crypto
      .createHash("sha512")
      .update([oid, String(params.nahtavillaoloVaiheId), params.poistumisPaiva, salt].join())
      .digest("hex");
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
    return crypto.createHash("sha512").update([oid, "lausuntopyynnon taydennys", uuid, salt].join()).digest("hex");
  }
}

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

export const lisaAineistoService = new LisaAineistoService();
