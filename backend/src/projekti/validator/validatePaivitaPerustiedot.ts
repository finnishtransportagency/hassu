import { DBProjekti } from "../../database/model";
import { VuorovaikutusKierrosTila, VuorovaikutusPerustiedotInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";

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
  if (projekti.nahtavillaoloVaiheJulkaisut && projekti.nahtavillaoloVaiheJulkaisut.length !== 0) {
    throw new IllegalArgumentError("Suunnitteluvaihe on päättynyt.");
  }
}
