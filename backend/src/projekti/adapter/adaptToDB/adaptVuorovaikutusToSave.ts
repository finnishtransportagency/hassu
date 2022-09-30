import { DBProjekti, Vuorovaikutus, VuorovaikutusTilaisuus } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { findVuorovaikutusByNumber } from "../../../util/findVuorovaikutusByNumber";
import { AineistoChangedEvent, ProjektiAdaptationResult, ProjektiEventType, VuorovaikutusPublishedEvent } from "../projektiAdapter";
import { IllegalArgumentError } from "../../../error/IllegalArgumentError";
import { adaptAineistotToSave, adaptIlmoituksenVastaanottajatToSave, adaptStandardiYhteystiedotToSave } from "./common";

export function adaptVuorovaikutusToSave(
  projekti: DBProjekti,
  projektiAdaptationResult: ProjektiAdaptationResult,
  vuorovaikutusInput?: API.VuorovaikutusInput | null
): Vuorovaikutus[] | undefined {
  if (vuorovaikutusInput) {
    // Prevent saving vuorovaikutus if suunnitteluvaihe is not yet saved
    if (!projekti.suunnitteluVaihe) {
      throw new IllegalArgumentError("Vuorovaikutusta ei voi lisätä ennen kuin suunnitteluvaihe on tallennettu");
    }

    if (!vuorovaikutusInput.vuorovaikutusTilaisuudet) {
      throw new IllegalArgumentError("Vuorovaikutuksella pitää olla ainakin yksi vuorovaikutustilaisuus");
    }
    if (!vuorovaikutusInput.ilmoituksenVastaanottajat) {
      throw new IllegalArgumentError("Vuorovaikutuksella on oltava ilmoituksenVastaanottajat!");
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
      throw new IllegalArgumentError("Vuorovaikutuksella pitää olla ainakin yksi vuorovaikutustilaisuus!");
    }
    if (!vuorovaikutusInput.esitettavatYhteystiedot) {
      throw new IllegalArgumentError("Vuorovaikutuksella pitää olla esitettavatYhteystiedot!");
    }

    const vuorovaikutusToSave: Vuorovaikutus = {
      vuorovaikutusNumero: vuorovaikutusInput.vuorovaikutusNumero,
      esitettavatYhteystiedot: adaptStandardiYhteystiedotToSave(vuorovaikutusInput.esitettavatYhteystiedot, true),
      vuorovaikutusTilaisuudet,
      // Jos vuorovaikutuksen ilmoituksella ei tarvitse olla viranomaisvastaanottajia, muokkaa adaptIlmoituksenVastaanottajatToSavea
      ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToSave(vuorovaikutusInput.ilmoituksenVastaanottajat),
      esittelyaineistot,
      suunnitelmaluonnokset,
      kysymyksetJaPalautteetViimeistaan: vuorovaikutusInput.kysymyksetJaPalautteetViimeistaan,
      vuorovaikutusJulkaisuPaiva: vuorovaikutusInput.vuorovaikutusJulkaisuPaiva,
      videot: vuorovaikutusInput.videot,
      suunnittelumateriaali: vuorovaikutusInput.suunnittelumateriaali,
      julkinen: vuorovaikutusInput.julkinen,
    };

    checkIfAineistoJulkinenChanged(vuorovaikutusToSave, dbVuorovaikutus, projektiAdaptationResult);

    return [vuorovaikutusToSave];
  }
  return undefined;
}

function checkIfAineistoJulkinenChanged(
  vuorovaikutusToSave: Vuorovaikutus,
  dbVuorovaikutus: Vuorovaikutus | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
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

function adaptVuorovaikutusTilaisuudetToSave(vuorovaikutusTilaisuudet: Array<API.VuorovaikutusTilaisuusInput>): VuorovaikutusTilaisuus[] {
  return vuorovaikutusTilaisuudet.map((vv) => {
    const vvToSave: VuorovaikutusTilaisuus = {
      paivamaara: vv.paivamaara,
      alkamisAika: vv.alkamisAika,
      paattymisAika: vv.paattymisAika,
      tyyppi: vv.tyyppi,
    };
    if (vv.tyyppi === API.VuorovaikutusTilaisuusTyyppi.SOITTOAIKA) {
      if (!vv.esitettavatYhteystiedot) {
        throw new IllegalArgumentError("Soittoajalla on oltava esitettavatYhteystiedot!");
      }
      vvToSave.esitettavatYhteystiedot = adaptStandardiYhteystiedotToSave(vv.esitettavatYhteystiedot, true);
    } else if (vv.tyyppi === API.VuorovaikutusTilaisuusTyyppi.PAIKALLA) {
      if (!vv.osoite) {
        throw new IllegalArgumentError("Fyysisellä tilaisuudella on oltava osoite!");
      }
      if (!vv.postinumero) {
        throw new IllegalArgumentError("Fyysisellä tilaisuudella on oltava postinumero!");
      }
      vvToSave.osoite = vv.osoite;
      vvToSave.postinumero = vv.postinumero;
      if (vv.Saapumisohjeet) {
        vvToSave.Saapumisohjeet = vv.Saapumisohjeet;
      }
      if (vv.paikka) {
        vvToSave.paikka = vv.paikka;
      }
      if (vv.postitoimipaikka) {
        vvToSave.postitoimipaikka = vv.postitoimipaikka;
      }
    } else {
      if (!vv.linkki) {
        throw new IllegalArgumentError("Online-tilaisuudella on oltava linkki!");
      }
      if (!vv.kaytettavaPalvelu) {
        throw new IllegalArgumentError("Online-tilaisuudella on oltava kaytettavaPalvelu!");
      }
      vvToSave.linkki = vv.linkki;
      vvToSave.kaytettavaPalvelu = vv.kaytettavaPalvelu;
    }
    if (vv.nimi) {
      vvToSave.nimi = vv.nimi;
    }
    return vvToSave;
  });
}
