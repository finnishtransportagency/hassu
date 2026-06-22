// Contains code generated or recommended by Amazon Q
import { KasittelynTilaFormValues } from "@pages/yllapito/projekti/[oid]/kasittelyntila";

export const asetaKasittelynTilaAutomaatiolla = (data: KasittelynTilaFormValues, defaults: KasittelynTilaFormValues) => {
  const asianumeroChanged =
    (data.kasittelynTila?.hyvaksymispaatos?.asianumero ?? null) !== defaults?.kasittelynTila?.hyvaksymispaatos?.asianumero;
  const hyvaksymisPvmChanged =
    (data.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm ?? null) !== defaults.kasittelynTila?.hyvaksymispaatos?.paatoksenPvm;
  if (asianumeroChanged && hyvaksymisPvmChanged) {
    data.kasittelynTila ??= {};
    data.kasittelynTila.suunnitelmanTila = "suunnitelman-tila/sutil04";
  }

  const lainvoimaAlkaenChanged = (data.kasittelynTila?.lainvoimaAlkaen ?? null) !== (defaults.kasittelynTila?.lainvoimaAlkaen ?? null);
  const lainvoimaPaatyenChanged = (data.kasittelynTila?.lainvoimaPaattyen ?? null) !== (defaults.kasittelynTila?.lainvoimaPaattyen ?? null);
  if (lainvoimaAlkaenChanged && lainvoimaPaatyenChanged) {
    data.kasittelynTila ??= {};
    data.kasittelynTila.suunnitelmanTila = "suunnitelman-tila/sutil05";
  }

  // "Osa" (sutil06) ja "Koko" (sutil07): liikenteelleluovutus ja toteutusilmoitus jakavat samat tilat.
  // Jos koko-kenttä on täytetty, tila on aina sutil07 eikä voi olla sutil06.
  const liikenteeseenluovutusOsittainChanged =
    (data.kasittelynTila?.liikenteeseenluovutusOsittain ?? null) !== (defaults.kasittelynTila?.liikenteeseenluovutusOsittain ?? null);
  const liikenteeseenluovutusKokonaanChanged =
    (data.kasittelynTila?.liikenteeseenluovutusKokonaan ?? null) !== (defaults.kasittelynTila?.liikenteeseenluovutusKokonaan ?? null);
  const toteutusilmoitusOsittainChanged =
    (data.kasittelynTila?.toteutusilmoitusOsittain ?? null) !== (defaults.kasittelynTila?.toteutusilmoitusOsittain ?? null);
  const toteutusilmoitusKokonaanChanged =
    (data.kasittelynTila?.toteutusilmoitusKokonaan ?? null) !== (defaults.kasittelynTila?.toteutusilmoitusKokonaan ?? null);

  const kokoTaytetty = !!(data.kasittelynTila?.liikenteeseenluovutusKokonaan || data.kasittelynTila?.toteutusilmoitusKokonaan);
  const osaChanged = liikenteeseenluovutusOsittainChanged || toteutusilmoitusOsittainChanged;
  const kokoChanged = liikenteeseenluovutusKokonaanChanged || toteutusilmoitusKokonaanChanged;

  const osaTaytetty = !!(data.kasittelynTila?.liikenteeseenluovutusOsittain || data.kasittelynTila?.toteutusilmoitusOsittain);

  if ((kokoChanged || osaChanged) && kokoTaytetty) {
    data.kasittelynTila ??= {};
    data.kasittelynTila.suunnitelmanTila = "suunnitelman-tila/sutil07";
  } else if ((kokoChanged || osaChanged) && osaTaytetty) {
    data.kasittelynTila ??= {};
    data.kasittelynTila.suunnitelmanTila = "suunnitelman-tila/sutil06";
  }

  const valitustenMaaraChanged = data.kasittelynTila?.valitustenMaara !== null && defaults.kasittelynTila?.valitustenMaara === null;
  if (valitustenMaaraChanged) {
    data.kasittelynTila ??= {};
    data.kasittelynTila.suunnitelmanTila = "suunnitelman-tila/sutil08";
  }

  const toimitusKaynnistynytChanged =
    (data.kasittelynTila?.toimitusKaynnistynyt ?? null) !== (defaults.kasittelynTila?.toimitusKaynnistynyt ?? null);
  if (toimitusKaynnistynytChanged) {
    data.kasittelynTila ??= {};
    data.kasittelynTila.suunnitelmanTila = "suunnitelman-tila/sutil14";
  }
};
