import type { DBProjekti } from "../../../backend/src/database/model";
import type { Projekti } from "../../graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";

export function validateVuorovaikutusKierrosCanBeDeleted(projekti: DBProjekti | Projekti): void {
  const vuorovaikutusNumero = projekti.vuorovaikutusKierros?.vuorovaikutusNumero;
  if (projekti.vuorovaikutusKierrosJulkaisut?.some((julkaisu) => julkaisu.id === vuorovaikutusNumero)) {
    throw new IllegalArgumentError("Julkaistua vuorovaikutuskierrosta ei voi poistaa!");
  }
  if (!vuorovaikutusNumero || vuorovaikutusNumero === 1) {
    throw new IllegalArgumentError("Ensimmäistä vuorovaikutuskierrosta ei voi poistaa!");
  }
}

export function canVuorovaikutusKierrosBeDeleted(projekti: DBProjekti | Projekti): boolean {
  try {
    validateVuorovaikutusKierrosCanBeDeleted(projekti);
    return true;
  } catch {
    return false;
  }
}
