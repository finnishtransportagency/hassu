import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import { Hyvaksymispaatos, KasittelynTila } from "../../../database/model";
import { KasittelyntilaInput } from "../../../../../common/graphql/apiModel";
import mergeWith from "lodash/mergeWith";
import isEqual from "lodash/isEqual";

export function adaptKasittelynTilaToSave(
  dbKasittelynTila: KasittelynTila | null | undefined,
  kasittelynTilaInput: KasittelyntilaInput | null | undefined,
  projektiAdaptationResult: ProjektiAdaptationResult
): KasittelynTila | undefined | null {
  if (!kasittelynTilaInput) {
    return undefined;
  }
  const hyvaksymispaatosMerged: Hyvaksymispaatos = mergeWith({}, dbKasittelynTila?.hyvaksymispaatos, kasittelynTilaInput.hyvaksymispaatos);

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
    kasittelynTilaInput.ensimmainenJatkopaatos
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

  const newKasittelynTila: KasittelynTila = mergeWith({}, dbKasittelynTila, kasittelynTilaInput);
  if (!isEqual(dbKasittelynTila, newKasittelynTila)) {
    projektiAdaptationResult.saveProjektiToVelho();
  }
  return newKasittelynTila;
}
