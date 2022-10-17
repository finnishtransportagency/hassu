import * as API from "../../../../../common/graphql/apiModel";
import { HyvaksymisPaatosVaihe } from "../../../database/model";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import { adaptAineistotToSave, adaptIlmoituksenVastaanottajatToSave, adaptStandardiYhteystiedotToSave } from "./common";
import mergeWith from "lodash/mergeWith";

export function adaptHyvaksymisPaatosVaiheToSave(
  dbHyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe | null | undefined,
  hyvaksymisPaatosVaihe: API.HyvaksymisPaatosVaiheInput | null | undefined,
  projektiAdaptationResult: ProjektiAdaptationResult,
  hyvaksymisPaatosVaiheJulkaisutCount: number | undefined
): HyvaksymisPaatosVaihe | undefined {
  if (!hyvaksymisPaatosVaihe) {
    return undefined;
  }
  const {
    hyvaksymisPaatos: hyvaksymisPaatosInput,
    aineistoNahtavilla: aineistoNahtavillaInput,
    kuulutusYhteystiedot,
    ilmoituksenVastaanottajat,
    kuulutusPaiva,
    kuulutusVaihePaattyyPaiva,
    hallintoOikeus,
  } = hyvaksymisPaatosVaihe;

  const aineistoNahtavilla = adaptAineistotToSave(
    dbHyvaksymisPaatosVaihe?.aineistoNahtavilla,
    aineistoNahtavillaInput,
    projektiAdaptationResult
  );

  const hyvaksymisPaatos = adaptAineistotToSave(dbHyvaksymisPaatosVaihe?.hyvaksymisPaatos, hyvaksymisPaatosInput, projektiAdaptationResult);

  let id = dbHyvaksymisPaatosVaihe?.id;
  if (!id) {
    if (hyvaksymisPaatosVaiheJulkaisutCount) {
      id = hyvaksymisPaatosVaiheJulkaisutCount + 1;
    } else {
      id = 1;
    }
  }

  const newChanges: HyvaksymisPaatosVaihe = {
    kuulutusPaiva,
    kuulutusVaihePaattyyPaiva,
    id,
    hyvaksymisPaatos,
    aineistoNahtavilla,
    kuulutusYhteystiedot: adaptStandardiYhteystiedotToSave(kuulutusYhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToSave(ilmoituksenVastaanottajat),
    hallintoOikeus,
  };
  return mergeWith({}, dbHyvaksymisPaatosVaihe, newChanges);
}
