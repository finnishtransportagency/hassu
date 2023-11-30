import {
  AineistoTila,
  LadattavaTiedosto,
  LadattavatTiedostot,
  LisaAineistoParametrit,
  ListaaLisaAineistoInput,
} from "hassu-common/graphql/apiModel";

import crypto from "crypto";
import dayjs from "dayjs";
import { IllegalAccessError, NotFoundError } from "hassu-common/error";
import { Aineisto, DBProjekti, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../database/model";
import { fileService } from "../files/fileService";
import { log } from "../logger";
import { nyt } from "../util/dateUtil";
import { jarjestaTiedostot } from "hassu-common/util/jarjestaTiedostot";

class LisaAineistoService {
  async listaaLisaAineisto(projekti: DBProjekti, params: ListaaLisaAineistoInput): Promise<LadattavatTiedostot> {
    const nahtavillaolo = findNahtavillaoloVaiheById(projekti, params.nahtavillaoloVaiheId);

    async function adaptLisaAineisto(aineisto: Aineisto): Promise<LadattavaTiedosto> {
      const { jarjestys, kategoriaId } = aineisto;
      const nimi = aineisto.nimi;
      let linkki;
      if (aineisto.tila == AineistoTila.VALMIS) {
        if (!aineisto.tiedosto) {
          const msg = `Virhe lisäaineiston listaamisessa: Aineistolta (nimi: ${nimi}, dokumenttiOid: ${aineisto.dokumenttiOid}) puuttuu tiedosto!`;
          log.error(msg, { aineisto });
          throw new Error(msg);
        }
        linkki = await fileService.createYllapitoSignedDownloadLink(projekti.oid, aineisto.tiedosto);
      } else {
        linkki = "";
      }
      return { __typename: "LadattavaTiedosto", nimi, jarjestys, kategoriaId, linkki };
    }

    const aineistot = (await Promise.all(nahtavillaolo?.aineistoNahtavilla?.map(adaptLisaAineisto) || [])).sort(jarjestaTiedostot) || [];
    const lisaAineistot = (await Promise.all(nahtavillaolo?.lisaAineisto?.map(adaptLisaAineisto) || [])).sort(jarjestaTiedostot) || [];
    const aineistopaketti = nahtavillaolo?.aineistopaketti
      ? await fileService.createYllapitoSignedDownloadLink(projekti.oid, nahtavillaolo?.aineistopaketti)
      : null;
    return { __typename: "LadattavatTiedostot", aineistot, lisaAineistot, poistumisPaiva: params.poistumisPaiva, aineistopaketti };
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

  private static createHash(oid: string, params: Omit<ListaaLisaAineistoInput, "hash">, salt: string | undefined): string {
    if (!salt) {
      throw new Error("Salt missing");
    }
    return crypto
      .createHash("sha512")
      .update([oid, String(params.nahtavillaoloVaiheId), params.poistumisPaiva, salt].join())
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

export const lisaAineistoService = new LisaAineistoService();
