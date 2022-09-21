import { DBProjekti, Vuorovaikutus, VuorovaikutusTilaisuus } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { findVuorovaikutusByNumber } from "../../../util/findVuorovaikutusByNumber";
import { AineistoChangedEvent, ProjektiAdaptationResult, ProjektiEventType, VuorovaikutusPublishedEvent } from "../projektiAdapter";
import { IllegalArgumentError } from "../../../error/IllegalArgumentError";
import { adaptAineistotToSave, adaptIlmoituksenVastaanottajatToSave, adaptStandardiYhteystiedot } from "./common";

export function adaptVuorovaikutusToSave(
  projekti: DBProjekti,
  projektiAdaptationResult: Partial<ProjektiAdaptationResult>,
  vuorovaikutusInput?: API.VuorovaikutusInput | null
): Vuorovaikutus[] {
  if (vuorovaikutusInput) {
    // Prevent saving vuorovaikutus if suunnitteluvaihe is not yet saved
    if (!projekti.suunnitteluVaihe) {
      throw new IllegalArgumentError("Vuorovaikutusta ei voi lisätä ennen kuin suunnitteluvaihe on tallennettu");
    }

    const dbVuorovaikutus = findVuorovaikutusByNumber(projekti, vuorovaikutusInput.vuorovaikutusNumero);

    const esittelyaineistot = adaptAineistotToSave(
      dbVuorovaikutus?.esittelyaineistot,
      vuorovaikutusInput.esittelyaineistot,
      projektiAdaptationResult
    );
    const suunnitelmaluonnokset = adaptAineistotToSave(
      dbVuorovaikutus?.suunnitelmaluonnokset,
      vuorovaikutusInput.suunnitelmaluonnokset,
      projektiAdaptationResult
    );

    const vuorovaikutusTilaisuudet = adaptVuorovaikutusTilaisuudetToSave(vuorovaikutusInput.vuorovaikutusTilaisuudet);
    // Vuorovaikutus must have at least one vuorovaikutustilaisuus
    if (!vuorovaikutusTilaisuudet) {
      throw new IllegalArgumentError("Vuorovaikutuksella pitää olla ainakin yksi vuorovaikutustilaisuus");
    }

    const vuorovaikutusToSave: Vuorovaikutus = {
      ...vuorovaikutusInput,
      vuorovaikutusTilaisuudet,
      // Jos vuorovaikutuksen ilmoituksella ei tarvitse olla viranomaisvastaanottajia, muokkaa adaptIlmoituksenVastaanottajatToSavea
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToSave(vuorovaikutusInput.ilmoituksenVastaanottajat),
      esittelyaineistot,
      suunnitelmaluonnokset,
    };

    checkIfAineistoJulkinenChanged(vuorovaikutusToSave, dbVuorovaikutus, projektiAdaptationResult);

    return [vuorovaikutusToSave];
  }
  return undefined;
}

function checkIfAineistoJulkinenChanged(
  vuorovaikutusToSave: Vuorovaikutus,
  dbVuorovaikutus: Vuorovaikutus,
  projektiAdaptationResult: Partial<ProjektiAdaptationResult>
) {
  function vuorovaikutusPublished() {
    return vuorovaikutusToSave.julkinen;
  }

  function vuorovaikutusNotPublicAnymore() {
    return dbVuorovaikutus && dbVuorovaikutus.julkinen && !vuorovaikutusToSave.julkinen;
  }

  function vuorovaikutusJulkaisuPaivaChanged() {
    return (
      dbVuorovaikutus?.vuorovaikutusJulkaisuPaiva &&
      dbVuorovaikutus.vuorovaikutusJulkaisuPaiva !== vuorovaikutusToSave.vuorovaikutusJulkaisuPaiva
    );
  }

  if (vuorovaikutusPublished() || vuorovaikutusNotPublicAnymore()) {
    const newEvent: VuorovaikutusPublishedEvent = {
      eventType: ProjektiEventType.VUOROVAIKUTUS_PUBLISHED,
      vuorovaikutusNumero: vuorovaikutusToSave.vuorovaikutusNumero,
    };
    projektiAdaptationResult.pushEvent(newEvent);
  }

  if (vuorovaikutusPublished() || vuorovaikutusNotPublicAnymore() || vuorovaikutusJulkaisuPaivaChanged()) {
    const newEvent: AineistoChangedEvent = {
      eventType: ProjektiEventType.AINEISTO_CHANGED,
    };
    projektiAdaptationResult.pushEvent(newEvent);
  }
}

function adaptVuorovaikutusTilaisuudetToSave(
  vuorovaikutusTilaisuudet: Array<API.VuorovaikutusTilaisuusInput>
): VuorovaikutusTilaisuus[] | undefined {
  return vuorovaikutusTilaisuudet?.length > 0
    ? vuorovaikutusTilaisuudet.map((vv) => {
        if (vv.tyyppi === API.VuorovaikutusTilaisuusTyyppi.SOITTOAIKA) {
          vv.esitettavatYhteystiedot = adaptStandardiYhteystiedot(vv.esitettavatYhteystiedot);
        }
        return vv;
      })
    : undefined;
}
