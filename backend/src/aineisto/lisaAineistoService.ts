import {
  AineistoTila,
  KuulutusJulkaisuTila,
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
import { adaptLausuntoPyyntoToDb } from "../projekti/adapter/adaptToDB";
import { ProjektiAdaptationResult } from "../projekti/adapter/projektiAdaptationResult";

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
    const lausuntoPyynto = findLausuntoPyyntoById(projekti, lausuntoPyyntoInput.id);
    const uusiLausuntoPyynto = adaptLausuntoPyyntoToDb(lausuntoPyynto, lausuntoPyyntoInput, new ProjektiAdaptationResult(projekti));
    async function adaptLisaAineisto(aineisto: Aineisto): Promise<LisaAineisto> {
      const { jarjestys, kategoriaId } = aineisto;
      const nimi = aineisto.nimi;
      const linkki = "(esikatselu)";
      return { __typename: "LisaAineisto", nimi, jarjestys, kategoriaId, linkki };
    }
    const aineistot = (await Promise.all(nahtavillaolo?.aineistoNahtavilla?.map(adaptLisaAineisto) || [])).sort(jarjestaAineistot) || [];
    const lisaAineistot =
      (await Promise.all(uusiLausuntoPyynto?.lisaAineistot?.map(adaptLisaAineisto) || [])).sort(jarjestaAineistot) || [];
    const aineistopaketti = "(esikatselu)";
    return { __typename: "LisaAineistot", aineistot, lisaAineistot, poistumisPaiva: lausuntoPyyntoInput.poistumisPaiva, aineistopaketti };
  }

  async listaaLausuntoPyyntoAineisto(projekti: DBProjekti, params: ListaaLausuntoPyyntoAineistotInput): Promise<LisaAineistot> {
    const nahtavillaolo = findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu(projekti);
    const lausuntoPyynto = findLausuntoPyyntoById(projekti, params.lausuntoPyyntoId);

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
    return { __typename: "LisaAineistot", aineistot, lisaAineistot, poistumisPaiva: params.poistumisPaiva, aineistopaketti };
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

  validateLausuntoPyyntoHash(oid: string, salt: string, params: ListaaLausuntoPyyntoAineistotInput) {
    const hash = LisaAineistoService.createLausuntoPyyntoHash(oid, params, salt);
    if (hash != params.hash) {
      log.error("Lausuntopyynnon aineiston tarkistussumma ei täsmää", { oid, params, salt, hash });
      throw new IllegalAccessError("Lausuntopyynnon aineiston tarkistussumma ei täsmää");
    }

    const poistumisPaivaEndOfTheDay = dayjs(params.poistumisPaiva).endOf("day");
    if (poistumisPaivaEndOfTheDay.isBefore(nyt())) {
      throw new NotFoundError("Lausuntopyynnon aineiston linkki on vanhentunut");
    }
  }

  validateLausuntoPyynnonTaydennysHash(oid: string, salt: string, params: ListaaLausuntoPyynnonTaydennyksenAineistotInput) {
    const hash = LisaAineistoService.createLausuntoPyynnonTaydennysHash(oid, params, salt);
    if (hash != params.hash) {
      log.error("Lausuntopyynnon täydennyksen aineiston tarkistussumma ei täsmää", { oid, params, salt, hash });
      throw new IllegalAccessError("Lausuntopyynnon täydennyksen aineiston tarkistussumma ei täsmää");
    }

    const poistumisPaivaEndOfTheDay = dayjs(params.poistumisPaiva).endOf("day");
    if (poistumisPaivaEndOfTheDay.isBefore(nyt())) {
      throw new NotFoundError("Lausuntopyynnon täydennyksen aineiston linkki on vanhentunut");
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

  private static createLausuntoPyyntoHash(
    oid: string,
    params: Omit<ListaaLausuntoPyyntoAineistotInput, "hash">,
    salt: string | undefined
  ): string {
    if (!salt) {
      throw new Error("Salt missing");
    }
    return crypto
      .createHash("sha512")
      .update([oid, String(params.lausuntoPyyntoId), params.poistumisPaiva, salt].join())
      .digest("hex");
  }

  private static createLausuntoPyynnonTaydennysHash(
    oid: string,
    params: Omit<ListaaLausuntoPyynnonTaydennyksenAineistotInput, "hash">,
    salt: string | undefined
  ): string {
    if (!salt) {
      throw new Error("Salt missing");
    }
    return crypto
      .createHash("sha512")
      .update([oid, String(params.kunta), params.poistumisPaiva, salt].join())
      .digest("hex");
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

function findLatestHyvaksyttyNahtavillaoloVaiheJulkaisu(projekti: DBProjekti): NahtavillaoloVaiheJulkaisu | undefined {
  if (projekti.nahtavillaoloVaiheJulkaisut) {
    projekti.nahtavillaoloVaiheJulkaisut.filter((julkaisu) => julkaisu.tila === KuulutusJulkaisuTila.HYVAKSYTTY).pop();
  } else {
    return undefined;
  }
}

function findLausuntoPyyntoById(projekti: DBProjekti, lausuntoPyyntoId: number): LausuntoPyynto | undefined {
  if (projekti.lausuntoPyynnot) {
    return projekti.lausuntoPyynnot.filter((pyynto) => pyynto.id === lausuntoPyyntoId).pop();
  } else {
    return undefined;
  }
}

function findLausuntoPyynnonTaydennysByKunta(projekti: DBProjekti, kunta: number): LausuntoPyynnonTaydennys | undefined {
  if (projekti.lausuntoPyynnonTaydennykset) {
    return projekti.lausuntoPyynnonTaydennykset.filter((pyynto) => pyynto.kunta === kunta).pop();
  } else {
    return undefined;
  }
}

export const lisaAineistoService = new LisaAineistoService();
