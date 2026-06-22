// Contains code generated or recommended by Amazon Q
import { asetaKasittelynTilaAutomaatiolla } from "src/util/asetaKasittelynTilaAutomaatiolla";
import { KasittelynTilaFormValues } from "@pages/yllapito/projekti/[oid]/kasittelyntila";

describe("asetaKasittelynTilaAutomaatiolla", () => {
  const baseFormValues = (): KasittelynTilaFormValues => ({
    oid: "test-oid",
    versio: 1,
    kasittelynTila: {
      hyvaksymispaatos: { asianumero: "", paatoksenPvm: null },
      liikenteeseenluovutusOsittain: null,
      liikenteeseenluovutusKokonaan: null,
      toteutusilmoitusOsittain: null,
      toteutusilmoitusKokonaan: null,
      toimitusKaynnistynyt: null,
      lainvoimaAlkaen: null,
      lainvoimaPaattyen: null,
      valitustenMaara: null,
    },
  });

  it("asettaa sutil06 kun toteutusilmoitusOsittain muuttuu", () => {
    const data = baseFormValues();
    data.kasittelynTila!.toteutusilmoitusOsittain = "2024-01-15";
    const defaults = baseFormValues();

    asetaKasittelynTilaAutomaatiolla(data, defaults);

    expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil06");
  });

  it("asettaa sutil07 kun toteutusilmoitusKokonaan muuttuu", () => {
    const data = baseFormValues();
    data.kasittelynTila!.toteutusilmoitusKokonaan = "2024-01-15";
    const defaults = baseFormValues();

    asetaKasittelynTilaAutomaatiolla(data, defaults);

    expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil07");
  });

  it("asettaa sutil06 kun liikenteeseenluovutusOsittain muuttuu", () => {
    const data = baseFormValues();
    data.kasittelynTila!.liikenteeseenluovutusOsittain = "2024-01-15";
    const defaults = baseFormValues();

    asetaKasittelynTilaAutomaatiolla(data, defaults);

    expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil06");
  });

  it("asettaa sutil07 kun liikenteeseenluovutusKokonaan muuttuu", () => {
    const data = baseFormValues();
    data.kasittelynTila!.liikenteeseenluovutusKokonaan = "2024-01-15";
    const defaults = baseFormValues();

    asetaKasittelynTilaAutomaatiolla(data, defaults);

    expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil07");
  });

  it("ei muuta tilaa kun toteutusilmoitusOsittain ei muutu", () => {
    const data = baseFormValues();
    const defaults = baseFormValues();

    asetaKasittelynTilaAutomaatiolla(data, defaults);

    expect(data.kasittelynTila!.suunnitelmanTila).toBeUndefined();
  });

  it("toteutusilmoitusKokonaan yliajaa toteutusilmoitusOsittain kun molemmat muuttuvat", () => {
    const data = baseFormValues();
    data.kasittelynTila!.toteutusilmoitusOsittain = "2024-01-10";
    data.kasittelynTila!.toteutusilmoitusKokonaan = "2024-01-15";
    const defaults = baseFormValues();

    asetaKasittelynTilaAutomaatiolla(data, defaults);

    expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil07");
  });

  it("asettaa sutil04 kun hyvaksymispaatos asianumero ja pvm molemmat muuttuvat", () => {
    const data = baseFormValues();
    data.kasittelynTila!.hyvaksymispaatos = { asianumero: "ABC-123", paatoksenPvm: "2024-01-15" };
    const defaults = baseFormValues();

    asetaKasittelynTilaAutomaatiolla(data, defaults);

    expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil04");
  });

  it("asettaa sutil14 kun toimitusKaynnistynyt muuttuu", () => {
    const data = baseFormValues();
    data.kasittelynTila!.toimitusKaynnistynyt = "2024-01-15";
    const defaults = baseFormValues();

    asetaKasittelynTilaAutomaatiolla(data, defaults);

    expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil14");
  });
});
