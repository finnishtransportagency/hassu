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
  const pysyvat = lausuntoPyyntoInput.map(
    (lausuntoPyynto) =>
      adaptLausuntoPyyntoToSave(
        dbLausuntoPyynnot?.find((pyynto) => pyynto.id === lausuntoPyynto.id),
        lausuntoPyynto,
        projektiAdaptationResult
      ) as LausuntoPyynto
  );

  const poistettavat: LausuntoPyynto[] =
    dbLausuntoPyynnot
      ?.filter((lausuntoPyynnonTaydennys) => !lausuntoPyyntoInput.find((taydennys) => taydennys.id === lausuntoPyynnonTaydennys.id))
      ?.map((lausuntoPyynto) => {
        const poistettava: LausuntoPyynto = {
          ...lausuntoPyynto,
          poistetaan: true,
          lisaAineistot:
            lausuntoPyynto.lisaAineistot?.map((aineisto) => ({
              ...aineisto,
              tila: API.AineistoTila.ODOTTAA_POISTOA,
            })) || undefined,
        };
        return poistettava;
      }) || [];

  return pysyvat.concat(poistettavat);
}

export function adaptLausuntoPyynnonTaydennyksetToSave(
  dbLausuntoPyynnonTaydennykset: LausuntoPyynnonTaydennys[] | undefined | null,
  lausuntoPyynnonTaydennysInput: API.LausuntoPyynnonTaydennysInput[] | undefined | null,
  projektiAdaptationResult: ProjektiAdaptationResult
): LausuntoPyynnonTaydennys[] | undefined {
  if (!lausuntoPyynnonTaydennysInput) {
    return undefined;
  }
  const pysyvat = lausuntoPyynnonTaydennysInput.map(
    (lausuntoPyynto) =>
      adaptLausuntoPyynnonTaydennysToSave(
        dbLausuntoPyynnonTaydennykset?.find((pyynto) => pyynto.kunta === lausuntoPyynto.kunta),
        lausuntoPyynto,
        projektiAdaptationResult
      ) as LausuntoPyynnonTaydennys
  );
  // Oletettavasti kunnat pysyvät samana prosessin ajan, mutta siltä varalta, että eivät pysy, tehdään tällainen mekanismi
  const poistettavat: LausuntoPyynnonTaydennys[] =
    dbLausuntoPyynnonTaydennykset
      ?.filter(
        (lausuntoPyynnonTaydennys) => !lausuntoPyynnonTaydennysInput.find((taydennys) => taydennys.kunta === lausuntoPyynnonTaydennys.kunta)
      )
      ?.map((lausuntoPyynnonTaydennys) => {
        const poistettava: LausuntoPyynnonTaydennys = {
          ...lausuntoPyynnonTaydennys,
          poistetaan: true,
          muuAineisto:
            lausuntoPyynnonTaydennys.muuAineisto?.map((aineisto) => ({
              ...aineisto,
              tila: API.AineistoTila.ODOTTAA_POISTOA,
            })) || undefined,
          muistutukset:
            lausuntoPyynnonTaydennys.muistutukset?.map((aineisto) => ({
              ...aineisto,
              tila: API.AineistoTila.ODOTTAA_POISTOA,
            })) || undefined,
        };
        return poistettava;
      }) || [];

  return pysyvat.concat(poistettavat);
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

  return mergeWith({}, dbLausuntoPyynto, { ...rest, lisaAineistot: lisaAineistotAdapted });
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

  return mergeWith({}, dbLausuntoPyynnonTaydennys, { ...rest, muuAineisto: muuAineistotAdapted });
}
