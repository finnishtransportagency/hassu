import { DBProjekti } from "../../database/model";
import { VuorovaikutusPaivitysInput } from "hassu-common/graphql/apiModel";
import { requirePermissionMuokkaa } from "../../user";
import { IllegalArgumentError } from "hassu-common/error";
import difference from "lodash/difference";

export function validatePaivitaVuorovaikutus(projekti: DBProjekti, input: VuorovaikutusPaivitysInput): void {
  requirePermissionMuokkaa(projekti);
  const affectedJulkaisu = projekti.vuorovaikutusKierrosJulkaisut?.find((julkaisu) => julkaisu.id == input.vuorovaikutusNumero);
  if (!affectedJulkaisu) {
    throw new IllegalArgumentError("Vuorovaikutusta ei ole vielä julkaistu");
  }
  if (input.vuorovaikutusNumero !== projekti.vuorovaikutusKierros?.vuorovaikutusNumero) {
    throw new IllegalArgumentError("Vuorovaikutusta ei voi päivittää, koska seuraava kierros on jo otettu suunnitteluun.");
  }
  if (!input.vuorovaikutusTilaisuudet) {
    throw new IllegalArgumentError("Input ei sisällä kenttää vuorovaikutusTilaisuudet");
  }
  if (input.vuorovaikutusTilaisuudet.length === 0) {
    throw new IllegalArgumentError("Vuorovaikutustilaisuuksia ei saa poistaa.");
  }
  if (input.vuorovaikutusTilaisuudet.length !== affectedJulkaisu.vuorovaikutusTilaisuudet?.length) {
    throw new IllegalArgumentError("Vuorovaikutustilaisuuksien määrää ei saa muuttaa");
  }
  if (
    input.vuorovaikutusTilaisuudet.find(
      (tilaisuus) =>
        difference(Object.keys(tilaisuus), ["lisatiedot", "esitettavatYhteystiedot", "kaytettavaPalvelu", "linkki", "nimi", "peruttu"])
          .length > 0
    )
  ) {
    throw new IllegalArgumentError(
      `Vuorovaikutus sisältää kiellettyjä arvoja. Sallittuja: ["lisatiedot", "esitettavatYhteystiedot", "kaytettavaPalvelu", "linkki", "nimi", "peruttu"]`
    );
  }
  if (projekti.nahtavillaoloVaiheJulkaisut && projekti.nahtavillaoloVaiheJulkaisut.length !== 0) {
    throw new IllegalArgumentError("Suunnitteluvaihe on päättynyt.");
  }
}
