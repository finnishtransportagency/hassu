import { DBProjekti } from "../../database/model";
import { TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import dayjs from "dayjs";

export function validateVuorovaikutuskierrokset(projekti: DBProjekti, input: TallennaProjektiInput) {
  const nbr = input.vuorovaikutusKierros?.vuorovaikutusNumero;
  const julkaisujenIdt = projekti.vuorovaikutusKierrosJulkaisut?.map((julkaisu) => julkaisu.id).filter((id) => id !== undefined) ?? [0];
  const suurinJulkaisuId = Math.max(...julkaisujenIdt);
  if (!projekti.vuorovaikutusKierros && nbr !== undefined && nbr !== suurinJulkaisuId + 1) {
    throw new IllegalArgumentError(
      "Vuorovaikutuskierroksen numeron on oltava pienimmillään yksi (1) ja yhden suurempi kuin aiemmat julkaisut."
    );
  }
  if (projekti.vuorovaikutusKierros && nbr !== undefined && projekti.vuorovaikutusKierros.vuorovaikutusNumero !== nbr) {
    throw new IllegalArgumentError("Annettu vuorovaikutusnumero ei vastaa meneillään olevan kierroksen numeroa.");
  }
  const julkaisupaiva = input.vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva;
  const edellisenJulkaisupaiva = projekti.vuorovaikutusKierrosJulkaisut?.find(
    (julkaisu) => julkaisu.id === (nbr ?? 1) - 1
  )?.vuorovaikutusJulkaisuPaiva;
  if (julkaisupaiva && edellisenJulkaisupaiva && dayjs(julkaisupaiva).isBefore(edellisenJulkaisupaiva, "day")) {
    throw new IllegalArgumentError("Uutta vuorovaikutuskierrosta ei voi julkaista ennen edellistä!");
  }
}
