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

  const lainvoimaAlkaenChanged = (data.kasittelynTila?.lainvoimaAlkaen ?? null) !== defaults.kasittelynTila?.lainvoimaAlkaen;
  const lainvoimaPaatyenChanged = (data.kasittelynTila?.lainvoimaPaattyen ?? null) !== defaults.kasittelynTila?.lainvoimaPaattyen;
  if (lainvoimaAlkaenChanged && lainvoimaPaatyenChanged) {
    data.kasittelynTila ??= {};
    data.kasittelynTila.suunnitelmanTila = "suunnitelman-tila/sutil05";
  }

  const liikenteeseenluovutusOsittainChanged =
    (data.kasittelynTila?.liikenteeseenluovutusOsittain ?? null) !== defaults.kasittelynTila?.liikenteeseenluovutusOsittain;
  if (liikenteeseenluovutusOsittainChanged) {
    data.kasittelynTila ??= {};
    data.kasittelynTila.suunnitelmanTila = "suunnitelman-tila/sutil06";
  }

  const liikenteeseenluovutusKokonaanChanged =
    (data.kasittelynTila?.liikenteeseenluovutusKokonaan ?? null) !== defaults.kasittelynTila?.liikenteeseenluovutusKokonaan;
  if (liikenteeseenluovutusKokonaanChanged) {
    data.kasittelynTila ??= {};
    data.kasittelynTila.suunnitelmanTila = "suunnitelman-tila/sutil07";
  }

  const toteutusilmoitusOsittainChanged =
    (data.kasittelynTila?.toteutusilmoitusOsittain ?? null) !== defaults.kasittelynTila?.toteutusilmoitusOsittain;
  if (toteutusilmoitusOsittainChanged) {
    data.kasittelynTila ??= {};
    data.kasittelynTila.suunnitelmanTila = "suunnitelman-tila/sutil06";
  }

  const toteutusilmoitusKokonaanChanged =
    (data.kasittelynTila?.toteutusilmoitusKokonaan ?? null) !== defaults.kasittelynTila?.toteutusilmoitusKokonaan;
  if (toteutusilmoitusKokonaanChanged) {
    data.kasittelynTila ??= {};
    data.kasittelynTila.suunnitelmanTila = "suunnitelman-tila/sutil07";
  }

  const valitustenMaaraChanged = data.kasittelynTila?.valitustenMaara !== null && defaults.kasittelynTila?.valitustenMaara === null;
  if (valitustenMaaraChanged) {
    data.kasittelynTila ??= {};
    data.kasittelynTila.suunnitelmanTila = "suunnitelman-tila/sutil08";
  }

  const toimitusKaynnistynytChanged = (data.kasittelynTila?.toimitusKaynnistynyt ?? null) !== defaults.kasittelynTila?.toimitusKaynnistynyt;
  if (toimitusKaynnistynytChanged) {
    data.kasittelynTila ??= {};
    data.kasittelynTila.suunnitelmanTila = "suunnitelman-tila/sutil14";
  }
};
