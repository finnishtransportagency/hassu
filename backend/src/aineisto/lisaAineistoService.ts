import {
  LisaAineisto,
  LisaAineistoParametrit,
  LisaAineistot,
  ListaaLisaAineistoInput,
} from "../../../common/graphql/apiModel";

import crypto from "crypto";
import dayjs from "dayjs";
import { IllegalAccessError } from "../error/IllegalAccessError";
import { DBProjekti, NahtavillaoloVaiheJulkaisu } from "../database/model";
import { NotFoundError } from "../error/NotFoundError";
import { fileService } from "../files/fileService";

class LisaAineistoService {
  listaaLisaAineisto(projekti: DBProjekti, params: ListaaLisaAineistoInput): LisaAineistot {
    const nahtavillaolo = findNahtavillaoloVaiheById(projekti, params.nahtavillaoloVaiheId);

    function adaptLisaAineisto(aineisto): LisaAineisto {
      const { nimi, jarjestys, kategoriaId } = aineisto;
      const linkki = fileService.createYllapitoSignedDownloadLink(projekti.oid, aineisto.tiedosto);
      return { __typename: "LisaAineisto", nimi, jarjestys, kategoriaId, linkki };
    }

    const aineistot = nahtavillaolo.aineistoNahtavilla?.map(adaptLisaAineisto) || [];
    const lisaAineistot = nahtavillaolo.lisaAineisto?.map(adaptLisaAineisto) || [];
    return { __typename: "LisaAineistot", aineistot, lisaAineistot };
  }

  generateListingParams(oid: string, nahtavillaoloVaiheId: number, salt: string): LisaAineistoParametrit {
    const expires = dayjs().add(180, "day").format("YYYY-MM-DD");
    if (!salt) {
      // Should not happen after going to production because salt is generated in the first save to DB
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

  private static createHash(
    oid: string,
    params: Omit<ListaaLisaAineistoInput, "hash">,
    salt: string | undefined
  ): string {
    if (!salt) {
      throw new Error("Salt missing");
    }
    return crypto
      .createHash("sha256")
      .update([oid, String(params.nahtavillaoloVaiheId), params.poistumisPaiva, salt].join())
      .digest("hex");
  }
}

function findNahtavillaoloVaiheById(
  projekti: DBProjekti,
  nahtavillaoloVaiheId: number
): NahtavillaoloVaiheJulkaisu | undefined {
  return []
    .concat(projekti.nahtavillaoloVaiheJulkaisut)
    .concat(projekti.nahtavillaoloVaihe)
    .filter((nahtavillaolo) => nahtavillaolo?.id == nahtavillaoloVaiheId)
    .pop();
}

export const lisaAineistoService = new LisaAineistoService();
