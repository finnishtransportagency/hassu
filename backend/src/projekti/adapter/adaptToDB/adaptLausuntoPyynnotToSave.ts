import * as API from "hassu-common/graphql/apiModel";
import { LadattuTiedosto, LausuntoPyynnonTaydennys, LausuntoPyynto } from "../../../database/model";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import mergeWith from "lodash/mergeWith";
import { log } from "../../../logger";
import { ladattuTiedostoTilaEiPoistettu } from "hassu-common/util/tiedostoTilaUtil";

export function adaptLausuntoPyynnotToSave(
  dbLausuntoPyynnot: LausuntoPyynto[] | undefined | null,
  lausuntoPyyntoInput: API.LausuntoPyyntoInput[] | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): LausuntoPyynto[] | undefined {
  if (!lausuntoPyyntoInput) {
    return undefined;
  }
  return lausuntoPyyntoInput.map(
    (lausuntoPyynto) =>
      adaptLausuntoPyyntoToSave(
        dbLausuntoPyynnot?.find((pyynto) => pyynto.uuid === lausuntoPyynto.uuid),
        lausuntoPyynto,
        projektiAdaptationResult
      ) as LausuntoPyynto
  );
}

export function adaptLausuntoPyynnonTaydennyksetToSave(
  dbLausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennys[] | undefined | null,
  lausuntoPyynnonTaydennysInput: API.LausuntoPyynnonTaydennysInput[] | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): LausuntoPyynnonTaydennys[] | undefined {
  if (!lausuntoPyynnonTaydennysInput) {
    return undefined;
  }
  return lausuntoPyynnonTaydennysInput.map(
    (lausuntoPyynto) =>
      adaptLausuntoPyynnonTaydennysToSave(
        dbLausuntoPyynnonTaydennykset?.find((pyynto) => pyynto.uuid === lausuntoPyynto.uuid),
        lausuntoPyynto,
        projektiAdaptationResult
      ) as LausuntoPyynnonTaydennys
  );
}

export function adaptLausuntoPyyntoToSave(
  dbLausuntoPyynto: LausuntoPyynto | undefined | null,
  lausuntoPyyntoInput: API.LausuntoPyyntoInput | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): LausuntoPyynto | undefined {
  if (!lausuntoPyyntoInput) {
    return undefined;
  }
  const { lisaAineistot: dbLisaAineistot, ...restDbLP } = dbLausuntoPyynto || {};
  const { lisaAineistot, ...rest } = lausuntoPyyntoInput;
  const lisaAineistotAdapted = lausuntoPyyntoInput
    ? adaptTiedostotToSave(dbLisaAineistot, lisaAineistot, projektiAdaptationResult)
    : undefined;
  if (lausuntoPyyntoInput.poistetaan) projektiAdaptationResult.filesChanged();
  return mergeWith({}, { ...restDbLP }, { ...rest, lisaAineistot: lisaAineistotAdapted });
}

export function adaptLausuntoPyynnonTaydennysToSave(
  dbLausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys | undefined | null,
  lausuntoPyynnonTaydennysInput: API.LausuntoPyynnonTaydennysInput | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): LausuntoPyynnonTaydennys | undefined {
  if (!lausuntoPyynnonTaydennysInput) {
    return undefined;
  }
  const { muuAineisto: dbMuuAineisto, muistutukset: dbMuistutukset, ...restDbLPT } = dbLausuntoPyynnonTaydennys || {};
  const { muuAineisto: muuAineistoInput, muistutukset: muistutuksetInput, ...restInput } = lausuntoPyynnonTaydennysInput;
  const muuAineisto = lausuntoPyynnonTaydennysInput
    ? adaptTiedostotToSave(dbMuuAineisto, muuAineistoInput, projektiAdaptationResult)
    : undefined;
  const muistutukset: LadattuTiedosto[] | undefined | null = adaptTiedostotToSave(
    dbMuistutukset,
    muistutuksetInput,
    projektiAdaptationResult
  );
  if (lausuntoPyynnonTaydennysInput.poistetaan) projektiAdaptationResult.filesChanged();
  return mergeWith({}, { ...restDbLPT }, { ...restInput, muuAineisto, muistutukset });
}

function adaptTiedostotToSave(
  dbTiedostot: LadattuTiedosto[] | undefined | null,
  tiedostotInput: API.LadattuTiedostoInput[] | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): LadattuTiedosto[] | undefined | null {
  const vanhatEiPoistamistaOdottavat = dbTiedostot?.filter((tiedosto) => ladattuTiedostoTilaEiPoistettu(tiedosto.tila));
  const vanhatPidettavat = vanhatEiPoistamistaOdottavat
    ?.reduce((vanhatPidettavat, vanhaTiedosto) => {
      const vastineInputissa = tiedostotInput?.find((tiedosto) => tiedosto.tiedosto === vanhaTiedosto.tiedosto);
      if (
        vastineInputissa &&
        vastineInputissa.tila === API.LadattuTiedostoTila.VALMIS &&
        vanhaTiedosto.tila === API.LadattuTiedostoTila.VALMIS
      ) {
        vanhatPidettavat.push(adaptTiedostoToSave(vanhaTiedosto, vastineInputissa, projektiAdaptationResult));
      }
      return vanhatPidettavat;
    }, [] as LadattuTiedosto[])
    .sort((a, b) => (a.jarjestys ?? 0) - (b.jarjestys ?? 0));
  const vanhatPoistamistaOdottavat = dbTiedostot?.filter((tiedosto) => !ladattuTiedostoTilaEiPoistettu(tiedosto.tila));
  const uudet = tiedostotInput
    ?.filter((tiedosto) => tiedosto.tila === API.LadattuTiedostoTila.ODOTTAA_PERSISTOINTIA)
    .map((tiedostoInput) => {
      const vanhaVastine = vanhatEiPoistamistaOdottavat?.find((dbTiedosto) => tiedostoInput.tiedosto === dbTiedosto.tiedosto);
      return adaptTiedostoToSave(vanhaVastine, tiedostoInput, projektiAdaptationResult);
    });
  const uudetPoistettavat = dbTiedostot
    ?.filter(
      (tiedosto) =>
        tiedosto.tila !== API.LadattuTiedostoTila.ODOTTAA_POISTOA &&
        tiedostotInput?.find(
          (inputTiedosto) => tiedosto.tiedosto === inputTiedosto.tiedosto && inputTiedosto.tila === API.LadattuTiedostoTila.ODOTTAA_POISTOA
        )
    )
    .map((dbTiedosto) => ({ ...dbTiedosto, tila: API.LadattuTiedostoTila.ODOTTAA_POISTOA }));
  const unohdetut = vanhatEiPoistamistaOdottavat
    ?.filter((tiedosto) => !tiedostotInput?.find((inputTiedosto) => tiedosto.tiedosto === inputTiedosto.tiedosto))
    .map((tiedosto) => ({
      ...tiedosto,
      tila: API.LadattuTiedostoTila.ODOTTAA_POISTOA,
    }));
  if (unohdetut?.length) {
    log.warn("TiedostotInputista puuttui tiedostoja");
    projektiAdaptationResult.filesChanged();
  }
  if (uudetPoistettavat?.length || uudet?.length) {
    projektiAdaptationResult.filesChanged();
  }
  return (uudet || [])
    .concat(vanhatPidettavat || [])
    .concat(uudetPoistettavat || [])
    .concat(vanhatPoistamistaOdottavat || [])
    .concat(unohdetut || []);
}

function adaptTiedostoToSave(
  dbTiedosto: LadattuTiedosto | undefined,
  tiedostoInput: API.LadattuTiedostoInput,
  projektiAdaptationResult: ProjektiAdaptationResult
): LadattuTiedosto {
  if (!dbTiedosto) {
    projektiAdaptationResult.filesChanged();
  }
  return mergeWith({}, dbTiedosto, tiedostoInput);
}
