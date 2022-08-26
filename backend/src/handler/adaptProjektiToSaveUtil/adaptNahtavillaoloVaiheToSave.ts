import { NahtavillaoloVaihe } from "../../database/model";
import * as API from "../../../../common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../projektiAdapter";
import {
  adaptYhteystiedotToSave,
  adaptAineistotToSave,
  adaptIlmoituksenVastaanottajatToSave,
  adaptHankkeenKuvausToSave,
} from "./common";
import mergeWith from "lodash/mergeWith";

export function adaptNahtavillaoloVaiheToSave(
  dbNahtavillaoloVaihe: NahtavillaoloVaihe,
  nahtavillaoloVaihe: API.NahtavillaoloVaiheInput,
  projektiAdaptationResult: ProjektiAdaptationResult,
  nahtavillaoloVaiheJulkaisutCount: number | undefined
): NahtavillaoloVaihe {
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
    kuulutusYhteysHenkilot,
  } = nahtavillaoloVaihe;

  const aineistoNahtavilla = adaptAineistotToSave(
    dbNahtavillaoloVaihe?.aineistoNahtavilla,
    aineistoNahtavillaInput,
    projektiAdaptationResult
  );

  const lisaAineisto = adaptAineistotToSave(
    dbNahtavillaoloVaihe?.lisaAineisto,
    lisaAineistoInput,
    projektiAdaptationResult
  );

  let id = dbNahtavillaoloVaihe?.id;
  if (!id) {
    if (nahtavillaoloVaiheJulkaisutCount) {
      id = nahtavillaoloVaiheJulkaisutCount + 1;
    } else {
      id = 1;
    }
  }

  return mergeWith({}, dbNahtavillaoloVaihe, {
    kuulutusPaiva,
    kuulutusVaihePaattyyPaiva,
    muistutusoikeusPaattyyPaiva,
    kuulutusYhteysHenkilot,
    id,
    aineistoNahtavilla,
    lisaAineisto,
    kuulutusYhteystiedot: adaptYhteystiedotToSave(kuulutusYhteystiedot),
    ilmoituksenVastaanottajat: adaptIlmoituksenVastaanottajatToSave(ilmoituksenVastaanottajat),
    hankkeenKuvaus: adaptHankkeenKuvausToSave(hankkeenKuvaus),
  } as NahtavillaoloVaihe);
}
