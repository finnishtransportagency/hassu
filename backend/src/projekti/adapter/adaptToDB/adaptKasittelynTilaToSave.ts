import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import { Hyvaksymispaatos, KasittelynTila, OikeudenPaatos } from "../../../database/model";
import { KasittelyntilaInput, OikeudenPaatosInput } from "hassu-common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import { preventArrayMergingCustomizer } from "../../../util/preventArrayMergingCustomizer";

export function adaptKasittelynTilaToSave(
  dbKasittelynTila: KasittelynTila | null | undefined,
  kasittelynTilaInput: KasittelyntilaInput | null | undefined,
  projektiAdaptationResult: ProjektiAdaptationResult
): KasittelynTila | undefined | null {
  if (!kasittelynTilaInput) {
    return undefined;
  }
  const { hallintoOikeus, korkeinHallintoOikeus, hyvaksymispaatos: hyvaksymispaatosInput, ...rest } = kasittelynTilaInput;
  const hyvaksymispaatosMerged: Hyvaksymispaatos = mergeWith(
    {},
    dbKasittelynTila?.hyvaksymispaatos,
    hyvaksymispaatosInput,
    preventArrayMergingCustomizer
  );

  const hyvaksymispaatosTiedotTaytetty =
    hyvaksymispaatosInput &&
    !dbKasittelynTila?.hyvaksymispaatos?.aktiivinen &&
    hyvaksymispaatosMerged.asianumero &&
    hyvaksymispaatosMerged.paatoksenPvm;

  // Jos kannassa oleva hyväksymispäätöksen aktiivisuusarvo ei ole aktiivinen ja hyväksymispäätöksen tiedot täytetään
  // Aktiivisuus arvoa käytetään asettamaan kenttien pakollisuus
  // Kun päivämäärä- ja asianumerotiedot kerran on annettu, ne on annettava jatkossakin
  const hyvaksymispaatos = hyvaksymispaatosTiedotTaytetty ? { ...hyvaksymispaatosInput, aktiivinen: true } : hyvaksymispaatosInput;

  const adaptedKasittelynTila = {
    ...rest,
    hyvaksymispaatos,
    hallintoOikeus: adaptHallintoOikeusToDB(hallintoOikeus),
    korkeinHallintoOikeus: korkeinHallintoOikeus !== undefined ? adaptHallintoOikeusToDB(korkeinHallintoOikeus) : undefined,
  };

  const newKasittelynTila: KasittelynTila = mergeWith({}, dbKasittelynTila, adaptedKasittelynTila, preventArrayMergingCustomizer);
  projektiAdaptationResult.saveProjektiToVelho();
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
