import { LausuntoPyynnonTaydennys, LausuntoPyynto, NahtavillaoloVaihe } from "../../../database/model";
import * as API from "hassu-common/graphql/apiModel";
import { ProjektiAdaptationResult } from "../projektiAdaptationResult";
import {
  adaptAineistotToSave,
  adaptHankkeenKuvausToSave,
  adaptIlmoituksenVastaanottajatToSave,
  adaptStandardiYhteystiedotToSave,
  getId,
} from "./common";
import mergeWith from "lodash/mergeWith";
import { adaptKuulutusSaamePDFtInput, adaptUudelleenKuulutusToSave } from "./adaptAloitusKuulutusToSave";
import { preventArrayMergingCustomizer } from "../../../util/preventArrayMergingCustomizer";
import { dateTimeToString, nyt } from "../../../util/dateUtil";

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
    lisaAineisto: lisaAineistoInput,
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

  const lisaAineisto = lisaAineistoInput
    ? adaptAineistotToSave(dbNahtavillaoloVaihe?.lisaAineisto, lisaAineistoInput, projektiAdaptationResult)
    : undefined;
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

  if (lisaAineisto) {
    uusiNahtavillaolovaihe.lisaAineisto = lisaAineisto;
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
        dbLausuntoPyynnot?.find((pyynto) => pyynto.id === lausuntoPyynto.id),
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
        dbLausuntoPyynnonTaydennykset?.find((pyynto) => pyynto.kunta === lausuntoPyynto.kunta),
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
  const { lisaAineistot, ...rest } = lausuntoPyyntoInput;
  const lisaAineistotAdapted = lausuntoPyyntoInput
    ? adaptAineistotToSave(dbLausuntoPyynto?.lisaAineistot, lisaAineistot, projektiAdaptationResult)
    : undefined;

  const luontiPaiva = dbLausuntoPyynto?.luontiPaiva ? dbLausuntoPyynto.luontiPaiva : dateTimeToString(nyt());
  // TODO hoita poistetaan aineistoChanged
  return mergeWith({}, dbLausuntoPyynto, { ...rest, lisaAineistot: lisaAineistotAdapted, luontiPaiva });
}

export function adaptLausuntoPyynnonTaydennysToSave(
  dbLausuntoPyynnonTaydennys: LausuntoPyynnonTaydennys | undefined | null,
  lausuntoPyynnonTaydennysInput: API.LausuntoPyynnonTaydennysInput | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): LausuntoPyynnonTaydennys | undefined {
  if (!lausuntoPyynnonTaydennysInput) {
    return undefined;
  }
  const { muuAineisto, ...rest } = lausuntoPyynnonTaydennysInput;
  const muuAineistotAdapted = lausuntoPyynnonTaydennysInput
    ? adaptAineistotToSave(dbLausuntoPyynnonTaydennys?.muuAineisto, muuAineisto, projektiAdaptationResult)
    : undefined;
  const luontiPaiva = dbLausuntoPyynnonTaydennys?.luontiPaiva ? dbLausuntoPyynnonTaydennys.luontiPaiva : dateTimeToString(nyt());
  // TODO hoita poistetaan aineistoChanged
  return mergeWith({}, dbLausuntoPyynnonTaydennys, { ...rest, muuAineisto: muuAineistotAdapted, luontiPaiva });
}
