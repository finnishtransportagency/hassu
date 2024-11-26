import { HyvaksymisEsityksenTiedot, Projekti, Status } from "@services/api";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";

export function projektiOnEpaaktiivinen(projekti: Projekti | ProjektiLisatiedolla | HyvaksymisEsityksenTiedot | null | undefined): boolean {
  if (!projekti) return true;
  return [Status.EPAAKTIIVINEN_1, Status.EPAAKTIIVINEN_2, Status.EPAAKTIIVINEN_3].includes(projekti.status as Status);
}
