import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import { Hyvaksymispaatos, KasittelynTila, OikeudenPaatos } from "../../../database/model";
import { KasittelyntilaInput, OikeudenPaatosInput } from "hassu-common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import isEqual from "lodash/isEqual";
import { preventArrayMergingCustomizer } from "../../../util/preventArrayMergingCustomizer";

export function adaptKasittelynTilaToSave(
  dbKasittelynTila: KasittelynTila | null | undefined,
  kasittelynTilaInput: KasittelyntilaInput | null | undefined,
  projektiAdaptationResult: ProjektiAdaptationResult
): KasittelynTila | undefined | null {
  if (!kasittelynTilaInput) {
    return undefined;
  }
  const hyvaksymispaatosMerged: Hyvaksymispaatos = mergeWith(
    {},
    dbKasittelynTila?.hyvaksymispaatos,
    kasittelynTilaInput.hyvaksymispaatos,
    preventArrayMergingCustomizer
  );

  // Jos kannassa oleva hyväksymispäätöksen aktiivisuusarvo ei ole aktiivinen ja hyväksymispäätöksen tiedot täytetään
  // Aktiivisuus arvoa käytetään asettamaan kenttien pakollisuus
  // Kun päivämäärä- ja asianumerotiedot kerran on annettu, ne on annettava jatkossakin
  if (
    kasittelynTilaInput.hyvaksymispaatos &&
    !dbKasittelynTila?.hyvaksymispaatos?.aktiivinen &&
    hyvaksymispaatosMerged.asianumero &&
    hyvaksymispaatosMerged.paatoksenPvm
  ) {
    kasittelynTilaInput.hyvaksymispaatos.aktiivinen = true;
  }

  const ensimmainenJatkopaatosMerged: Hyvaksymispaatos = mergeWith(
    {},
    dbKasittelynTila?.ensimmainenJatkopaatos,
    kasittelynTilaInput.ensimmainenJatkopaatos,
    preventArrayMergingCustomizer
  );
  // Tunnista jatkopäätöksen lisäys ja lisää event käyttöoikeuksien nollaamiseksi
  if (
    !dbKasittelynTila?.ensimmainenJatkopaatos?.aktiivinen &&
    ensimmainenJatkopaatosMerged.aktiivinen &&
    ensimmainenJatkopaatosMerged.asianumero &&
    ensimmainenJatkopaatosMerged.paatoksenPvm
  ) {
    projektiAdaptationResult.resetKayttooikeudetAndSynchronizeVelho();
  }

  const toinenJatkopaatosMerged: Hyvaksymispaatos = mergeWith(
    {},
    dbKasittelynTila?.toinenJatkopaatos,
    kasittelynTilaInput.toinenJatkopaatos,
    preventArrayMergingCustomizer
  );
  // Tunnista jatkopäätöksen lisäys ja lisää event käyttöoikeuksien nollaamiseksi
  if (
    !dbKasittelynTila?.toinenJatkopaatos?.aktiivinen &&
    toinenJatkopaatosMerged.aktiivinen &&
    toinenJatkopaatosMerged.asianumero &&
    toinenJatkopaatosMerged.paatoksenPvm
  ) {
    projektiAdaptationResult.resetKayttooikeudetAndSynchronizeVelho();
  }
  const { hallintoOikeus, korkeinHallintoOikeus, ...rest } = kasittelynTilaInput;
  const adaptedKasittelynTila = {
    ...rest,
    hallintoOikeus: adaptHallintoOikeusToDB(hallintoOikeus),
    korkeinHallintoOikeus: korkeinHallintoOikeus !== undefined ? adaptHallintoOikeusToDB(korkeinHallintoOikeus) : undefined,
  };

  const newKasittelynTila: KasittelynTila = mergeWith({}, dbKasittelynTila, adaptedKasittelynTila, preventArrayMergingCustomizer);
  if (!isEqual(dbKasittelynTila, newKasittelynTila)) {
    projektiAdaptationResult.saveProjektiToVelho();
  }
  return newKasittelynTila;
}

function adaptHallintoOikeusToDB(hallintoOikeus: OikeudenPaatosInput | undefined | null): OikeudenPaatos | undefined | null {
  if (!hallintoOikeus) {
    return hallintoOikeus;
  }
  return {
    hyvaksymisPaatosKumottu: hallintoOikeus.hyvaksymisPaatosKumottu,
    valipaatos: hallintoOikeus.valipaatos
      ? {
          paiva: hallintoOikeus.valipaatos?.paiva ?? undefined,
          sisalto: hallintoOikeus.valipaatos?.sisalto ?? undefined,
        }
      : undefined,
    paatos: hallintoOikeus.paatos
      ? {
          paiva: hallintoOikeus.paatos?.paiva ?? undefined,
          sisalto: hallintoOikeus.paatos?.sisalto ?? undefined,
        }
      : undefined,
  };
}
