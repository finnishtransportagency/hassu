import * as API from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { Kielitiedot, LocalizedMap } from "../../../../database/model";
import isString from "lodash/isString";
import { isKieliTranslatable, KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import assert from "assert";

export function adaptLokalisoituTekstiToSave(
  lokalisoituTekstiInput: API.LokalisoituTekstiInput | undefined | null,
  kielitiedot: Kielitiedot
): LocalizedMap<string> | undefined | null {
  if (!lokalisoituTekstiInput) {
    return lokalisoituTekstiInput;
  }

  assert(
    isKieliTranslatable(kielitiedot.ensisijainenKieli),
    "ensisijaisen kielen on oltava käännettävä kieli, esim. saame ei ole sallittu"
  );
  if (!isString(lokalisoituTekstiInput[kielitiedot.ensisijainenKieli as KaannettavaKieli])) {
    throw new IllegalArgumentError(
      `adaptLokalisoituTekstiToSave: lokalisoituTekstiInput.${kielitiedot.ensisijainenKieli} (ensisijainen kieli) puuttuu`
    );
  }
  const teksti: LocalizedMap<string> = {
    [kielitiedot.ensisijainenKieli]: lokalisoituTekstiInput[kielitiedot.ensisijainenKieli as KaannettavaKieli],
  };
  if (isKieliTranslatable(kielitiedot.toissijainenKieli)) {
    const toisellaKielella = lokalisoituTekstiInput[kielitiedot.toissijainenKieli as KaannettavaKieli];
    if (!isString(toisellaKielella)) {
      throw new IllegalArgumentError(
        `adaptLokalisoituTekstiToSave: lokalisoituTekstiInput.${kielitiedot.toissijainenKieli} (toissijainen kieli) puuttuu`
      );
    }
    teksti[kielitiedot.toissijainenKieli as KaannettavaKieli] = toisellaKielella;
  }
  return teksti;
}
