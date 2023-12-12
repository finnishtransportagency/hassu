import { LisaAineistoParametrit, ListaaLisaAineistoInput } from "hassu-common/graphql/apiModel";

import crypto from "crypto";
import dayjs from "dayjs";
import { IllegalAccessError, NotFoundError } from "hassu-common/error";
import { log } from "../logger";
import { nyt } from "../util/dateUtil";

class LisaAineistoService {
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

export const lisaAineistoService = new LisaAineistoService();
