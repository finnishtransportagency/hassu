import * as API from "hassu-common/graphql/apiModel";
import { HyvaksymisPaatosVaihe } from "../../../database/model";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import {
  adaptAineistotToSave,
  adaptIlmoituksenVastaanottajatToSave,
  adaptStandardiYhteystiedotToSave,
  adaptUudelleenKuulutusToSave,
  adaptKuulutusSaamePDFtInput,
} from "./common";
import mergeWith from "lodash/mergeWith";
import { preventArrayMergingCustomizer } from "../../../util/preventArrayMergingCustomizer";

export function adaptHyvaksymisPaatosVaiheToSave(
  dbHyvaksymisPaatosVaihe: HyvaksymisPaatosVaihe | null | undefined,
  hyvaksymisPaatosVaihe: API.HyvaksymisPaatosVaiheInput | null | undefined,
  projektiAdaptationResult: ProjektiAdaptationResult
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
    viimeinenVoimassaolovuosi,
    uudelleenKuulutus,
    hyvaksymisPaatosVaiheSaamePDFt,
  } = hyvaksymisPaatosVaihe;

  const aineistoNahtavilla = adaptAineistotToSave(
    dbHyvaksymisPaatosVaihe?.aineistoNahtavilla,
    aineistoNahtavillaInput,
    projektiAdaptationResult
  );

  const hyvaksymisPaatos = adaptAineistotToSave(dbHyvaksymisPaatosVaihe?.hyvaksymisPaatos, hyvaksymisPaatosInput, projektiAdaptationResult);

  let id = dbHyvaksymisPaatosVaihe?.id;
  if (!id) {
    id = 1;
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
    viimeinenVoimassaolovuosi,
  };

  if (hyvaksymisPaatosVaiheSaamePDFt) {
    newChanges.hyvaksymisPaatosVaiheSaamePDFt = adaptKuulutusSaamePDFtInput(
      dbHyvaksymisPaatosVaihe?.hyvaksymisPaatosVaiheSaamePDFt,
      hyvaksymisPaatosVaiheSaamePDFt
    );
  }

  if (uudelleenKuulutus) {
    newChanges.uudelleenKuulutus = adaptUudelleenKuulutusToSave(dbHyvaksymisPaatosVaihe?.uudelleenKuulutus, uudelleenKuulutus);
  }

  return mergeWith({}, dbHyvaksymisPaatosVaihe, newChanges, preventArrayMergingCustomizer);
}
