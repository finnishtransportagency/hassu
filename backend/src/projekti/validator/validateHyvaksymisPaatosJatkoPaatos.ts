import { DBProjekti } from "../../database/model";
import { Projekti, Status, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { isStatusGreaterOrEqualTo } from "hassu-common/statusOrder";
import { kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import { validateMuokkaustilaAllowsInput } from "./validateMuokkaustilaAllowsInput";
import { validateAineistoInput } from "./validateAineistoInput";

type PaatosKey = keyof Pick<TallennaProjektiInput, "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe">;

export function validateHyvaksymisPaatosJatkoPaatos(projekti: DBProjekti, apiProjekti: Projekti, input: TallennaProjektiInput) {
  validateMuokkaustilaAllowsInput(projekti.hyvaksymisPaatosVaihe, projekti.hyvaksymisPaatosVaiheJulkaisut, input.hyvaksymisPaatosVaihe);
  validateMuokkaustilaAllowsInput(projekti.jatkoPaatos1Vaihe, projekti.jatkoPaatos1VaiheJulkaisut, input.jatkoPaatos1Vaihe);
  validateMuokkaustilaAllowsInput(projekti.jatkoPaatos2Vaihe, projekti.jatkoPaatos2VaiheJulkaisut, input.jatkoPaatos2Vaihe);
  const paatosKeyStatusArray: [PaatosKey, Status][] = [
    ["hyvaksymisPaatosVaihe", Status.HYVAKSYMISMENETTELYSSA],
    ["jatkoPaatos1Vaihe", Status.JATKOPAATOS_1],
    ["jatkoPaatos2Vaihe", Status.JATKOPAATOS_2],
  ];

  paatosKeyStatusArray.forEach(([key, status]) => {
    const { aineistoNahtavilla, hyvaksymisPaatos, ...kuulutuksenTiedot } = input[key] ?? {};
    const kuulutuksenTiedotContainInput = Object.values(kuulutuksenTiedot).some((value) => !!value);
    const aineistotPresent = !!aineistoNahtavilla?.length;
    const paatosAineistoPresent = !!hyvaksymisPaatos?.length;
    const hasAineistotLackingKategoria = !!aineistoNahtavilla?.some(
      (aineisto) => !aineisto.kategoriaId || aineisto.kategoriaId === kategorisoimattomatId
    );
    const aineistoInputOk = aineistotPresent && paatosAineistoPresent && !hasAineistotLackingKategoria;
    if (kuulutuksenTiedotContainInput && !isStatusGreaterOrEqualTo(apiProjekti.status, status) && !aineistoInputOk) {
      throw new IllegalArgumentError(key + " aineistoja ei ole vielä tallennettu tai niiden joukossa on kategorisoimattomia.");
    }
  });
  validateAineistoInput(projekti.hyvaksymisPaatosVaihe?.aineistoNahtavilla, input.hyvaksymisPaatosVaihe?.aineistoNahtavilla);
  validateAineistoInput(projekti.hyvaksymisPaatosVaihe?.hyvaksymisPaatos, input.hyvaksymisPaatosVaihe?.hyvaksymisPaatos);
  validateAineistoInput(projekti.jatkoPaatos1Vaihe?.aineistoNahtavilla, input.jatkoPaatos1Vaihe?.aineistoNahtavilla);
  validateAineistoInput(projekti.jatkoPaatos1Vaihe?.hyvaksymisPaatos, input.jatkoPaatos1Vaihe?.hyvaksymisPaatos);
  validateAineistoInput(projekti.jatkoPaatos2Vaihe?.aineistoNahtavilla, input.jatkoPaatos2Vaihe?.aineistoNahtavilla);
  validateAineistoInput(projekti.jatkoPaatos2Vaihe?.hyvaksymisPaatos, input.jatkoPaatos2Vaihe?.hyvaksymisPaatos);
}
