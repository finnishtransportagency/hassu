import { DBProjekti, Vuorovaikutus, VuorovaikutusTilaisuus } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { findVuorovaikutusByNumber } from "../../../util/findVuorovaikutusByNumber";
import { AineistoChangedEvent, ProjektiAdaptationResult, ProjektiEventType, VuorovaikutusPublishedEvent } from "../projektiAdapter";
import { IllegalArgumentError } from "../../../error/IllegalArgumentError";
import { adaptKayttajatunnusList } from "./adaptKayttajatunnusList";
import { adaptAineistotToSave, adaptIlmoituksenVastaanottajatToSave, adaptYhteystiedotToSave } from "./common";

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

    const vuorovaikutusTilaisuudet = adaptVuorovaikutusTilaisuudetToSave(projekti, vuorovaikutusInput.vuorovaikutusTilaisuudet);
    // Vuorovaikutus must have at least one vuorovaikutustilaisuus
    if (!vuorovaikutusTilaisuudet) {
      throw new IllegalArgumentError("Vuorovaikutuksella pitää olla ainakin yksi vuorovaikutustilaisuus");
    }

    const vuorovaikutusToSave: Vuorovaikutus = {
      ...vuorovaikutusInput,
      vuorovaikutusYhteysHenkilot: adaptKayttajatunnusList(projekti, vuorovaikutusInput.vuorovaikutusYhteysHenkilot),
      vuorovaikutusTilaisuudet,
      // Jos vuorovaikutuksen ilmoituksella ei tarvitse olla viranomaisvastaanottajia, muokkaa adaptIlmoituksenVastaanottajatToSavea
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToSave(vuorovaikutusInput.ilmoituksenVastaanottajat),
      esitettavatYhteystiedot: adaptYhteystiedotToSave(vuorovaikutusInput.esitettavatYhteystiedot),
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
    projektiAdaptationResult.pushEvent({
      eventType: ProjektiEventType.VUOROVAIKUTUS_PUBLISHED,
      vuorovaikutusNumero: vuorovaikutusToSave.vuorovaikutusNumero,
    } as VuorovaikutusPublishedEvent);
  }

  if (vuorovaikutusPublished() || vuorovaikutusNotPublicAnymore() || vuorovaikutusJulkaisuPaivaChanged()) {
    projektiAdaptationResult.pushEvent({
      eventType: ProjektiEventType.AINEISTO_CHANGED,
    } as AineistoChangedEvent);
  }
}

function adaptVuorovaikutusTilaisuudetToSave(
  projekti: DBProjekti,
  vuorovaikutusTilaisuudet: Array<API.VuorovaikutusTilaisuusInput>
): VuorovaikutusTilaisuus[] | undefined {
  return vuorovaikutusTilaisuudet?.length > 0
    ? vuorovaikutusTilaisuudet.map((vv) => ({
        ...vv,
        esitettavatYhteystiedot: adaptYhteystiedotToSave(vv.esitettavatYhteystiedot),
        projektiYhteysHenkilot: adaptKayttajatunnusList(projekti, vv.projektiYhteysHenkilot, true),
      }))
    : undefined;
}
