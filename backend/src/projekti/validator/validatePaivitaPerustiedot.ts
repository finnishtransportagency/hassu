import { DBProjekti } from "../../database/model";
import { VuorovaikutusKierrosTila, VuorovaikutusPerustiedotInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { validateAineistoInput } from "./validateAineistoInput";
import { yhdistaVuorovaikutusAineistot } from "hassu-common/vuorovaikutusAineistoKategoria";

export function validatePaivitaPerustiedot(projekti: DBProjekti, input: VuorovaikutusPerustiedotInput): void {
  if (projekti.vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.MUOKATTAVISSA) {
    throw new IllegalArgumentError(`Vuorovaikutuskierros on muokattavissa. Käytä normaalia projektin päivitystoimintoa.`);
  }
  if (projekti.vuorovaikutusKierros?.tila === VuorovaikutusKierrosTila.MIGROITU) {
    throw new IllegalArgumentError(`Et voi päivittää migratoidun vuorovaikutuskierroksen perustietoja.`);
  }
  if (projekti.vuorovaikutusKierros?.vuorovaikutusNumero !== input.vuorovaikutusKierros.vuorovaikutusNumero) {
    throw new IllegalArgumentError(`Et voi päivittää muun viimeisimmän vuorovaikutuskierroksen perustietoja.`);
  }
  if (
    projekti.vuorovaikutusKierrosJulkaisut?.some(
      (julkaisu) => !!julkaisu.kopioituProjektista && julkaisu.id === input.vuorovaikutusKierros.vuorovaikutusNumero
    )
  ) {
    throw new IllegalArgumentError(`Et voi päivittää kopioidun julkaisun tietoja. Tulee luoda uusi vuorovaikutuskierros.`);
  }
  if (projekti.nahtavillaoloVaiheJulkaisut?.length) {
    throw new IllegalArgumentError("Suunnitteluvaihe on päättynyt.");
  }
  validateAineistoInput(
    projekti.vuorovaikutusKierros?.aineistot,
    yhdistaVuorovaikutusAineistot({
      esittelyaineistot: input.vuorovaikutusKierros?.esittelyaineistot,
      suunnitelmaluonnokset: input.vuorovaikutusKierros?.suunnitelmaluonnokset,
    })
  );
}
