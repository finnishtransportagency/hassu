import { DBProjekti } from "../../database/model";
import { Projekti, Status, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { isProjektiStatusGreaterOrEqualTo } from "hassu-common/statusOrder";
import { kategorisoimattomatId } from "hassu-common/aineistoKategoriat";
import { validateMuokkaustilaAllowsInput } from "./validateMuokkaustilaAllowsInput";
import { validateAineistoInput } from "./validateAineistoInput";

export function validateNahtavillaoloVaihe(projekti: DBProjekti, apiProjekti: Projekti, input: TallennaProjektiInput) {
  validateMuokkaustilaAllowsInput(projekti.nahtavillaoloVaihe, projekti.nahtavillaoloVaiheJulkaisut, input.nahtavillaoloVaihe);

  const { aineistoNahtavilla, ...kuulutuksenTiedot } = input.nahtavillaoloVaihe ?? {};
  const kuulutuksenTiedotContainInput = Object.values(kuulutuksenTiedot).some((value) => !!value);

  const aineistotPresent = aineistoNahtavilla?.length;
  const hasAineistotLackingKategoria = aineistoNahtavilla?.some(
    (aineisto) => !aineisto.kategoriaId || aineisto.kategoriaId === kategorisoimattomatId
  );
  const aineistotOk = !!aineistotPresent && !hasAineistotLackingKategoria;
  if (kuulutuksenTiedotContainInput && !isProjektiStatusGreaterOrEqualTo(apiProjekti, Status.NAHTAVILLAOLO) && !aineistotOk) {
    throw new IllegalArgumentError("Nähtävilläolovaiheen aineistoja ei ole vielä tallennettu tai niiden joukossa on kategorisoimattomia.");
  }
  validateAineistoInput(projekti.nahtavillaoloVaihe?.aineistoNahtavilla, input.nahtavillaoloVaihe?.aineistoNahtavilla);
}
