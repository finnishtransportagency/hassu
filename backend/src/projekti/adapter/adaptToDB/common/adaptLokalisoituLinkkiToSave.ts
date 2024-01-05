import * as API from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { Kielitiedot, Linkki, RequiredLocalizedMap } from "../../../../database/model";
import { isKieliTranslatable, KaannettavaKieli } from "hassu-common/kaannettavatKielet";
import assert from "assert";

export function adaptLokalisoituLinkkiToSave(
  lokalisoituLinkkiInput: API.LokalisoituLinkkiInput | undefined | null,
  kielitiedot: Kielitiedot
): RequiredLocalizedMap<Linkki> | undefined {
  if (!lokalisoituLinkkiInput) {
    return lokalisoituLinkkiInput as undefined;
  }

  if (!lokalisoituLinkkiInput[API.Kieli.SUOMI]) {
    throw new IllegalArgumentError(`adaptLokalisoituLinkkiToSave: lokalisoituLinkkiInput.SUOMI puuttuu`);
  }
  const teksti: RequiredLocalizedMap<Linkki> = { [API.Kieli.SUOMI]: lokalisoituLinkkiInput[API.Kieli.SUOMI] };
  assert(
    isKieliTranslatable(kielitiedot.ensisijainenKieli),
    "ensisijaisen kielen on oltava käännettävä kieli, esim. saame ei ole sallittu"
  );
  const ensisijainenKieliLinkki = lokalisoituLinkkiInput[kielitiedot.ensisijainenKieli as KaannettavaKieli];
  if (!ensisijainenKieliLinkki) {
    throw new IllegalArgumentError(
      `adaptLokalisoituLinkkiToSave: lokalisoituLinkkiInput.${kielitiedot.ensisijainenKieli} (ensisijainen kieli) puuttuu`
    );
  }
  teksti[kielitiedot.ensisijainenKieli as KaannettavaKieli] = ensisijainenKieliLinkki;
  if (kielitiedot.toissijainenKieli && isKieliTranslatable(kielitiedot.toissijainenKieli)) {
    const toisellaKielella = lokalisoituLinkkiInput[kielitiedot.toissijainenKieli as KaannettavaKieli];
    if (!toisellaKielella) {
      throw new IllegalArgumentError(
        `adaptLokalisoituLinkkiToSave: lokalisoituLinkkiInput.${kielitiedot.toissijainenKieli} (toissijainen kieli) puuttuu`
      );
    }
    teksti[kielitiedot.toissijainenKieli as KaannettavaKieli] = toisellaKielella;
  }
  return teksti;
}

export function adaptLokalisoidutLinkitToSave(
  lokalisoituLinkkiInput: API.LokalisoituLinkkiInput[] | undefined | null,
  kielitiedot: Kielitiedot
): RequiredLocalizedMap<Linkki>[] | undefined | null {
  if (!lokalisoituLinkkiInput) {
    return lokalisoituLinkkiInput;
  }
  return lokalisoituLinkkiInput
    .map((linkki) => adaptLokalisoituLinkkiToSave(linkki, kielitiedot))
    .filter((linkki) => !!linkki) as RequiredLocalizedMap<Linkki>[];
}
