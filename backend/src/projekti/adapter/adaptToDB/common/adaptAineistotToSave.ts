import { Aineisto, LadattuTiedosto } from "../../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../../projektiAdaptationResult";
import mergeWith from "lodash/mergeWith";
import { log } from "../../../../logger";

export type LausuntoPyynnotDB = LadattuTiedosto[] | undefined | null;

export function adaptAineistotToSave(
  dbAineistot: Aineisto[] | undefined | null,
  aineistoInput: API.AineistoInput[] | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): Aineisto[] | undefined | null {
  log.info("dbAineistot", dbAineistot);
  const uudetAineistot = aineistoInput
    ?.map((inputaineisto) => {
      const vastaavaVanhaAineisto = dbAineistot?.find((dbaineisto) => dbaineisto.uuid == inputaineisto.uuid);
      return adaptAineistoToSave(vastaavaVanhaAineisto, inputaineisto, projektiAdaptationResult);
    })
    .filter((aineisto) => !(aineisto.tila == API.AineistoTila.ODOTTAA_POISTOA && !aineisto.tuotu))
    .concat(
      (dbAineistot ?? []).filter(
        (dbaineisto) =>
          dbaineisto.tila == API.AineistoTila.ODOTTAA_POISTOA && !aineistoInput.find((aineisto) => aineisto.uuid == dbaineisto.uuid)
      )
    );
  log.info("uudetAineistot", uudetAineistot);
  return uudetAineistot;
}

function adaptAineistoToSave(
  dbAineisto: Aineisto | undefined,
  aineistoInputt: API.AineistoInput,
  projektiAdaptationResult: ProjektiAdaptationResult
): Aineisto {
  if (!dbAineisto || dbAineisto.tila !== aineistoInputt.tila) {
    projektiAdaptationResult.aineistoChanged();
  }
  const preventTilaOverWrite = dbAineisto?.tila == API.AineistoTila.VALMIS && aineistoInputt.tila == API.AineistoTila.ODOTTAA_TUONTIA;
  const tila = preventTilaOverWrite ? API.LadattuTiedostoTila.VALMIS : aineistoInputt.tila;
  return mergeWith({}, dbAineisto, { ...aineistoInputt, tila });
}
