import { NahtavillaoloVaihe } from "../../../database/model";
import * as API from "../../../../../common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../projektiAdapter";
import {
  adaptAineistotToSave,
  adaptHankkeenKuvausToSave,
  adaptIlmoituksenVastaanottajatToSave,
  adaptStandardiYhteystiedotToSave,
} from "./common";
import mergeWith from "lodash/mergeWith";

export function adaptNahtavillaoloVaiheToSave(
  dbNahtavillaoloVaihe: NahtavillaoloVaihe | undefined | null,
  nahtavillaoloVaihe: API.NahtavillaoloVaiheInput | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult,
  nahtavillaoloVaiheJulkaisutCount: number | undefined
): NahtavillaoloVaihe | undefined {
  if (!nahtavillaoloVaihe) {
    return undefined;
  }
  const {
    aineistoNahtavilla: aineistoNahtavillaInput,
    lisaAineisto: lisaAineistoInput,
    kuulutusYhteystiedot,
    ilmoituksenVastaanottajat,
    hankkeenKuvaus,
    kuulutusPaiva,
    kuulutusVaihePaattyyPaiva,
    muistutusoikeusPaattyyPaiva,
  } = nahtavillaoloVaihe;

  const aineistoNahtavilla = adaptAineistotToSave(
    dbNahtavillaoloVaihe?.aineistoNahtavilla,
    aineistoNahtavillaInput,
    projektiAdaptationResult
  );

  const lisaAineisto = lisaAineistoInput
    ? adaptAineistotToSave(dbNahtavillaoloVaihe?.lisaAineisto, lisaAineistoInput, projektiAdaptationResult)
    : undefined;

  let id = dbNahtavillaoloVaihe?.id;
  if (!id) {
    if (nahtavillaoloVaiheJulkaisutCount) {
      id = nahtavillaoloVaiheJulkaisutCount + 1;
    } else {
      id = 1;
    }
  }

  const uusiNahtavillaolovaihe: NahtavillaoloVaihe = {
    kuulutusPaiva,
    kuulutusVaihePaattyyPaiva,
    muistutusoikeusPaattyyPaiva,
    id,
    aineistoNahtavilla,
  };

  if (kuulutusYhteystiedot) {
    uusiNahtavillaolovaihe.kuulutusYhteystiedot = adaptStandardiYhteystiedotToSave(kuulutusYhteystiedot);
  }
  if (ilmoituksenVastaanottajat) {
    uusiNahtavillaolovaihe.ilmoituksenVastaanottajat = adaptIlmoituksenVastaanottajatToSave(ilmoituksenVastaanottajat);
  }
  if (hankkeenKuvaus) {
    uusiNahtavillaolovaihe.hankkeenKuvaus = adaptHankkeenKuvausToSave(hankkeenKuvaus);
  }

  if (lisaAineisto) {
    uusiNahtavillaolovaihe.lisaAineisto = lisaAineisto;
  }

  return mergeWith({}, dbNahtavillaoloVaihe, uusiNahtavillaolovaihe);
}
