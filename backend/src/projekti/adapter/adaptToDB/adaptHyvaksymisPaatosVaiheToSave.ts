import * as API from "../../../../../common/graphql/apiModel";
import { HyvaksymisPaatosVaihe } from "../../../database/model";
import { ProjektiAdaptationResult } from "../projektiAdapter";
import { adaptAineistotToSave, adaptIlmoituksenVastaanottajatToSave, adaptYhteystiedotToSave } from "./common";
import mergeWith from "lodash/mergeWith";
import { IllegalArgumentError } from "../../../error/IllegalArgumentError";

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
    kuulutusYhteysHenkilot,
    hallintoOikeus,
  } = hyvaksymisPaatosVaihe;

  if (!kuulutusYhteystiedot) {
    throw new IllegalArgumentError("Hyväksymispäätösvaiheelle on annettava kuulutusYhteystiedot!");
  }
  if (!ilmoituksenVastaanottajat) {
    throw new IllegalArgumentError("Hyväksymispäätösvaiheelle on oltava ilmoituksenVastaanottajat!");
  }
  if (!aineistoNahtavillaInput) {
    throw new IllegalArgumentError("Hyväksymispäätösvaiheella on oltava aineistoNahtavilla!");
  }
  if (!hyvaksymisPaatosInput) {
    throw new IllegalArgumentError("Hyväksymispäätösvaiheella on oltava hyvaksymisPaatos!");
  }

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
    kuulutusYhteysHenkilot,
    id,
    hyvaksymisPaatos,
    aineistoNahtavilla,
    kuulutusYhteystiedot: adaptYhteystiedotToSave(kuulutusYhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToSave(ilmoituksenVastaanottajat),
    hallintoOikeus,
  };
  return mergeWith({}, dbHyvaksymisPaatosVaihe, newChanges);
}
