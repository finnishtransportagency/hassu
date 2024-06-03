import crypto from "crypto";
import { IllegalAccessError } from "hassu-common/error";
import { log } from "../../logger";

export function validateHyvaksymisEsitysHash(oid: string, salt: string, versio: number, givenHash: string) {
  const hash = createHyvaksymisEsitysHash(oid, versio, salt);
  if (hash != givenHash) {
    log.error("Hyväksymisesityksen aineiston tarkistussumma ei täsmää", { oid, salt, givenHash });
    throw new IllegalAccessError("Hyväksymisesityksen aineiston tarkistussumma ei täsmää");
  }
}

export function createHyvaksymisEsitysHash(oid: string, versio: number, salt: string | undefined): string {
  if (!salt) {
    throw new Error("Salt missing");
  }
  return crypto.createHash("sha512").update([oid, "hyvaksymisesitys", versio, salt].join()).digest("hex");
}
