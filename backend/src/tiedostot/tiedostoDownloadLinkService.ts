import {
  LausuntoPyynnonTaydennysInput,
  LausuntoPyyntoInput,
  LadattavatTiedostot,
  ListaaLausuntoPyynnonTaydennyksenTiedostotInput,
  ListaaLausuntoPyyntoTiedostotInput,
} from "hassu-common/graphql/apiModel";

import crypto from "crypto";
import { IllegalAccessError } from "hassu-common/error";
import { DBProjekti, LausuntoPyynnonTaydennys, LausuntoPyynto } from "../database/model";
import { log } from "../logger";

class TiedostoDownloadLinkService {
  async esikatseleLausuntoPyynnonAineistot(_projekti: DBProjekti, _lausuntoPyyntoInput: LausuntoPyyntoInput): Promise<LadattavatTiedostot> {
    throw new Error("Not implemented yet");
  }

  async esikatseleLausuntoPyynnonTaydennyksenAineistot(
    _projekti: DBProjekti,
    _lausuntoPyynnonTaydennysInput: LausuntoPyynnonTaydennysInput
  ): Promise<LadattavatTiedostot> {
    throw new Error("Not implemented yet");
  }

  async listaaLausuntoPyyntoAineisto(_projekti: DBProjekti, _params: ListaaLausuntoPyyntoTiedostotInput): Promise<LadattavatTiedostot> {
    throw new Error("Not implemented yet");
  }

  async listaaLausuntoPyynnonTaydennyksenAineisto(
    _projekti: DBProjekti,
    _params: ListaaLausuntoPyynnonTaydennyksenTiedostotInput
  ): Promise<LadattavatTiedostot> {
    throw new Error("Not implemented yet");
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
    return TiedostoDownloadLinkService.createLausuntoPyyntoHash(oid, uuid, salt);
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
    return crypto.createHash("sha512").update([oid, "lausuntopyynnon taydennys", uuid, salt].join()).digest("hex");
  }
}

export const tiedostoDownloadLinkService = new TiedostoDownloadLinkService();
