import { AsianTila, Vaihe } from "@services/api";
import { ProjektiLisatiedolla } from "hassu-common/ProjektiValidationContext";

export function isAsianhallintaVaarassaTilassa(projekti: Pick<ProjektiLisatiedolla, "asianhallinta">, vaihe: Vaihe): boolean {
  return (
    !projekti.asianhallinta?.inaktiivinen &&
    (projekti.asianhallinta?.aktiivinenTila?.vaihe !== vaihe || projekti.asianhallinta?.aktiivinenTila?.tila !== AsianTila.VALMIS_VIENTIIN)
  );
}
