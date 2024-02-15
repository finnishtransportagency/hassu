import { Aineisto } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../../projektiAdaptationResult";
import mergeWith from "lodash/mergeWith";
import { omit } from "lodash";

export function adaptAineistotToSave(
  dbAineistot: Aineisto[] | undefined | null,
  aineistoInput: API.AineistoInput[] | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): Aineisto[] | undefined | null {
  const uudetAineistot = aineistoInput
    ?.map((inputaineisto) => {
      const vastaavaVanhaAineisto = haeVastaavaVanhaAineisto(dbAineistot, inputaineisto);

      return adaptAineistoToSave(vastaavaVanhaAineisto, inputaineisto, projektiAdaptationResult);
    })
    .filter((aineisto) => !(aineisto.tila == API.AineistoTila.ODOTTAA_POISTOA && !aineisto.tuotu))
    .concat(
      (dbAineistot ?? []).filter(
        (dbaineisto) =>
          dbaineisto.tila == API.AineistoTila.ODOTTAA_POISTOA && !aineistoInput.find(findInputAineistoFromDBAineisto(dbaineisto))
      )
    );
  return uudetAineistot;
}

const findDbAineistoFromAineistoInput = (inputaineisto: API.AineistoInput) => (dbaineisto: Aineisto) =>
  dbaineisto.uuidGeneratedBySchemaMigration
    ? inputaineisto.dokumenttiOid === dbaineisto.dokumenttiOid
    : inputaineisto.uuid === dbaineisto.uuid;

const findInputAineistoFromDBAineisto = (dbaineisto: Aineisto) => (inputaineisto: API.AineistoInput) =>
  dbaineisto.uuidGeneratedBySchemaMigration
    ? inputaineisto.dokumenttiOid === dbaineisto.dokumenttiOid
    : inputaineisto.uuid === dbaineisto.uuid;

function haeVastaavaVanhaAineisto(dbAineistot: Aineisto[] | null | undefined, inputaineisto: API.AineistoInput) {
  const vastaavaVanhaAineisto = dbAineistot?.find(findDbAineistoFromAineistoInput(inputaineisto));
  return vastaavaVanhaAineisto ? omit(vastaavaVanhaAineisto, "uuidGeneratedBySchemaMigration") : undefined;
}

function adaptAineistoToSave(
  dbAineisto: Aineisto | undefined,
  aineistoInput: API.AineistoInput,
  projektiAdaptationResult: ProjektiAdaptationResult
): Aineisto {
  if (!dbAineisto || dbAineisto.tila !== aineistoInput.tila) {
    projektiAdaptationResult.aineistoChanged();
  }
  const preventTilaOverWrite = dbAineisto?.tila == API.AineistoTila.VALMIS && aineistoInput.tila == API.AineistoTila.ODOTTAA_TUONTIA;
  const tila = preventTilaOverWrite ? API.LadattuTiedostoTila.VALMIS : aineistoInput.tila;
  return mergeWith({}, dbAineisto, { ...aineistoInput, tila });
}
