import crypto from "crypto";
import { IllegalAccessError } from "hassu-common/error";
import { log } from "../../logger";

export function generateHash(oid: string, salt: string): string {
  return createHyvaksymisEsitysHash(oid, salt);
}

export function validateHash(oid: string, salt: string, givenHash: string) {
  const hash = createHyvaksymisEsitysHash(oid, salt);
  if (hash != givenHash) {
    log.error("Lausuntopyynnon aineiston tarkistussumma ei täsmää", { oid, salt, givenHash });
    throw new IllegalAccessError("Lausuntopyynnon aineiston tarkistussumma ei täsmää");
  }
}

function createHyvaksymisEsitysHash(oid: string, salt: string | undefined): string {
  if (!salt) {
    throw new Error("Salt missing");
  }
  return crypto.createHash("sha512").update([oid, "hyvaksymisesitys", salt].join()).digest("hex");
}
