import { LisaAineisto, LisaAineistoParametrit, ListaaLisaAineistoInput } from "../../../common/graphql/apiModel";

import crypto from "crypto";
import dayjs from "dayjs";
import { IllegalAccessError } from "../error/IllegalAccessError";
import { Aineisto, DBProjekti } from "../database/model";
import { NotFoundError } from "../error/NotFoundError";
import { fileService } from "../files/fileService";

class LisaAineistoService {
  listaaLisaAineisto(projekti: DBProjekti, params: ListaaLisaAineistoInput): LisaAineisto[] {
    const aineistot = findNahtavillaoloVaiheLisaAineistoById(projekti, params.nahtavillaoloVaiheId);
    return (
      aineistot?.map((aineisto) => {
        const { nimi, jarjestys, kategoriaId } = aineisto;
        const linkki = fileService.createYllapitoSignedDownloadLink(projekti.oid, aineisto.tiedosto);
        return { __typename: "LisaAineisto", nimi, jarjestys, kategoriaId, linkki };
      }) || []
    );
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

function findNahtavillaoloVaiheLisaAineistoById(
  projekti: DBProjekti,
  nahtavillaoloVaiheId: number
): Aineisto[] | undefined {
  return []
    .concat(projekti.nahtavillaoloVaiheJulkaisut)
    .concat(projekti.nahtavillaoloVaihe)
    .filter((nahtavillaolo) => nahtavillaolo?.id == nahtavillaoloVaiheId)
    .pop()?.lisaAineisto;
}

export const lisaAineistoService = new LisaAineistoService();
