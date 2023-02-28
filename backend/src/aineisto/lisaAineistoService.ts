import {
  AineistoTila,
  LisaAineisto,
  LisaAineistoParametrit,
  LisaAineistot,
  ListaaLisaAineistoInput,
} from "../../../common/graphql/apiModel";

import crypto from "crypto";
import dayjs from "dayjs";
import { IllegalAccessError } from "../error/IllegalAccessError";
import { Aineisto, DBProjekti, NahtavillaoloVaihe, NahtavillaoloVaiheJulkaisu } from "../database/model";
import { NotFoundError } from "../error/NotFoundError";
import { fileService } from "../files/fileService";
import { log } from "../logger";

class LisaAineistoService {
  listaaLisaAineisto(projekti: DBProjekti, params: ListaaLisaAineistoInput): LisaAineistot {
    const nahtavillaolo = findNahtavillaoloVaiheById(projekti, params.nahtavillaoloVaiheId);

    function adaptLisaAineisto(aineisto: Aineisto): LisaAineisto {
      const { jarjestys, kategoriaId } = aineisto;
      let nimi = aineisto.nimi;
      let linkki;
      if (aineisto.tila == AineistoTila.VALMIS) {
        if (!aineisto.tiedosto) {
          const msg = `Virhe lisäaineiston listaamisessa: Aineistolta (nimi: ${nimi}, dokumenttiOid: ${aineisto.dokumenttiOid}) puuttuu tiedosto!`;
          log.error(msg, { aineisto });
          throw new Error(msg);
        }
        linkki = fileService.createYllapitoSignedDownloadLink(projekti.oid, aineisto.tiedosto);
      } else {
        nimi = nimi + " (odottaa tuontia)";
        linkki = "";
      }
      return { __typename: "LisaAineisto", nimi, jarjestys, kategoriaId, linkki };
    }

    const aineistot = nahtavillaolo?.aineistoNahtavilla?.map(adaptLisaAineisto) || [];
    const lisaAineistot = nahtavillaolo?.lisaAineisto?.map(adaptLisaAineisto) || [];
    return { __typename: "LisaAineistot", aineistot, lisaAineistot, poistumisPaiva: params.poistumisPaiva };
  }

  generateListingParams(oid: string, nahtavillaoloVaiheId: number, salt: string): LisaAineistoParametrit {
    const expires = dayjs().add(180, "day").format("YYYY-MM-DD");
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
      throw new IllegalAccessError("Lisäaineston tarkistussumma ei täsmää");
    }

    const poistumisPaivaEndOfTheDay = dayjs(params.poistumisPaiva).set("hour", 23).set("minute", 59);
    if (poistumisPaivaEndOfTheDay.isBefore(dayjs())) {
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
