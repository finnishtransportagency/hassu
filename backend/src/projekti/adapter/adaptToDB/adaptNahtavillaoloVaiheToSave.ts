import { NahtavillaoloVaihe } from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import {
  adaptAineistotToSave,
  adaptHankkeenKuvausToSave,
  adaptIlmoituksenVastaanottajatToSave,
  adaptStandardiYhteystiedotToSave,
  getId,
  adaptUudelleenKuulutusToSave,
  adaptKuulutusSaamePDFtInput,
} from "./common";
import mergeWith from "lodash/mergeWith";
import { preventArrayMergingCustomizer } from "../../../util/preventArrayMergingCustomizer";

export function adaptNahtavillaoloVaiheToSave(
  dbNahtavillaoloVaihe: NahtavillaoloVaihe | undefined | null,
  nahtavillaoloVaihe: API.NahtavillaoloVaiheInput | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): NahtavillaoloVaihe | undefined {
  if (!nahtavillaoloVaihe) {
    return undefined;
  }
  const {
    aineistoNahtavilla: aineistoNahtavillaInput,
    kuulutusYhteystiedot,
    ilmoituksenVastaanottajat,
    hankkeenKuvaus,
    kuulutusPaiva,
    kuulutusVaihePaattyyPaiva,
    muistutusoikeusPaattyyPaiva,
    uudelleenKuulutus,
    nahtavillaoloSaamePDFt,
  } = nahtavillaoloVaihe;

  const aineistoNahtavilla = adaptAineistotToSave(
    dbNahtavillaoloVaihe?.aineistoNahtavilla,
    aineistoNahtavillaInput,
    projektiAdaptationResult
  );

  const id = getId(dbNahtavillaoloVaihe);

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

  if (nahtavillaoloSaamePDFt) {
    uusiNahtavillaolovaihe.nahtavillaoloSaamePDFt = adaptKuulutusSaamePDFtInput(
      dbNahtavillaoloVaihe?.nahtavillaoloSaamePDFt,
      nahtavillaoloSaamePDFt
    );
  }

  if (uudelleenKuulutus) {
    uusiNahtavillaolovaihe.uudelleenKuulutus = adaptUudelleenKuulutusToSave(dbNahtavillaoloVaihe?.uudelleenKuulutus, uudelleenKuulutus);
  }

  return mergeWith({}, dbNahtavillaoloVaihe, uusiNahtavillaolovaihe, preventArrayMergingCustomizer);
}
