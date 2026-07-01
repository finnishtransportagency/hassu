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

  it("asettaa sutil04 kun hyvaksymispaatos asianumero ja pvm molemmat muuttuvat", () => {
    const data = baseFormValues();
    data.kasittelynTila!.hyvaksymispaatos = { asianumero: "ABC-123", paatoksenPvm: "2024-01-15" };
    const defaults = baseFormValues();

    asetaKasittelynTilaAutomaatiolla(data, defaults, false, false);

    expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil04");
  });

  it("ei aseta sutil04 kun hyvaksymispaatos on jo aktiivinen eika ole yllapitaja", () => {
    const data = baseFormValues();
    data.kasittelynTila!.hyvaksymispaatos = { asianumero: "ABC-123", paatoksenPvm: "2024-01-15" };
    const defaults = baseFormValues();

    asetaKasittelynTilaAutomaatiolla(data, defaults, false, true);

    expect(data.kasittelynTila!.suunnitelmanTila).toBeUndefined();
  });

  it("asettaa sutil04 kun yllapitaja muokkaa vaikka hyvaksymispaatos on jo aktiivinen", () => {
    const data = baseFormValues();
    data.kasittelynTila!.hyvaksymispaatos = { asianumero: "ABC-123", paatoksenPvm: "2024-01-15" };
    const defaults = baseFormValues();

    asetaKasittelynTilaAutomaatiolla(data, defaults, true, true);

    expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil04");
  });

  it("asettaa sutil05 kun lainvoima alkaen ja paattyen molemmat muuttuvat", () => {
    const data = baseFormValues();
    data.kasittelynTila!.lainvoimaAlkaen = "2024-01-15";
    data.kasittelynTila!.lainvoimaPaattyen = "2028-01-15";
    const defaults = baseFormValues();

    asetaKasittelynTilaAutomaatiolla(data, defaults, true, false);

    expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil05");
  });

  describe("Liikenteelleluovutus/Toteutusilmoitus (sutil06/sutil07)", () => {
    it("asettaa sutil06 kun liikenteeseenluovutusOsittain muuttuu", () => {
      const data = baseFormValues();
      data.kasittelynTila!.liikenteeseenluovutusOsittain = "2024-01-15";
      const defaults = baseFormValues();

      asetaKasittelynTilaAutomaatiolla(data, defaults, true, false);

      expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil06");
    });

    it("asettaa sutil06 kun toteutusilmoitusOsittain muuttuu", () => {
      const data = baseFormValues();
      data.kasittelynTila!.toteutusilmoitusOsittain = "2024-01-15";
      const defaults = baseFormValues();

      asetaKasittelynTilaAutomaatiolla(data, defaults, true, false);

      expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil06");
    });

    it("asettaa sutil07 kun liikenteeseenluovutusKokonaan muuttuu", () => {
      const data = baseFormValues();
      data.kasittelynTila!.liikenteeseenluovutusKokonaan = "2024-01-15";
      const defaults = baseFormValues();

      asetaKasittelynTilaAutomaatiolla(data, defaults, true, false);

      expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil07");
    });

    it("asettaa sutil07 kun toteutusilmoitusKokonaan muuttuu", () => {
      const data = baseFormValues();
      data.kasittelynTila!.toteutusilmoitusKokonaan = "2024-01-15";
      const defaults = baseFormValues();

      asetaKasittelynTilaAutomaatiolla(data, defaults, true, false);

      expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil07");
    });

    it("asettaa sutil07 kun osa muuttuu mutta koko on jo täytetty (liikenteeseenluovutus)", () => {
      const data = baseFormValues();
      data.kasittelynTila!.liikenteeseenluovutusOsittain = "2024-01-10";
      data.kasittelynTila!.liikenteeseenluovutusKokonaan = "2024-02-01"; // koko jo täytetty
      const defaults = baseFormValues();
      defaults.kasittelynTila!.liikenteeseenluovutusKokonaan = "2024-02-01"; // koko ei muuttunut

      asetaKasittelynTilaAutomaatiolla(data, defaults, true, false);

      expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil07");
    });

    it("asettaa sutil07 kun osa muuttuu mutta koko on jo täytetty (toteutusilmoitus)", () => {
      const data = baseFormValues();
      data.kasittelynTila!.toteutusilmoitusOsittain = "2024-01-10";
      data.kasittelynTila!.toteutusilmoitusKokonaan = "2024-02-01"; // koko jo täytetty
      const defaults = baseFormValues();
      defaults.kasittelynTila!.toteutusilmoitusKokonaan = "2024-02-01"; // koko ei muuttunut

      asetaKasittelynTilaAutomaatiolla(data, defaults, true, false);

      expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil07");
    });

    it("asettaa sutil06 kun koko poistetaan ja osa on täytetty", () => {
      const data = baseFormValues();
      data.kasittelynTila!.liikenteeseenluovutusOsittain = "2024-01-10";
      data.kasittelynTila!.liikenteeseenluovutusKokonaan = null; // koko poistettu
      const defaults = baseFormValues();
      defaults.kasittelynTila!.liikenteeseenluovutusOsittain = "2024-01-10";
      defaults.kasittelynTila!.liikenteeseenluovutusKokonaan = "2024-02-01"; // koko oli täytetty

      asetaKasittelynTilaAutomaatiolla(data, defaults, true, false);

      expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil06");
    });

    it("ei muuta tilaa kun koko poistetaan eikä osa ole täytetty", () => {
      const data = baseFormValues();
      data.kasittelynTila!.liikenteeseenluovutusKokonaan = null; // koko poistettu
      const defaults = baseFormValues();
      defaults.kasittelynTila!.liikenteeseenluovutusKokonaan = "2024-02-01"; // koko oli täytetty

      asetaKasittelynTilaAutomaatiolla(data, defaults, true, false);

      expect(data.kasittelynTila!.suunnitelmanTila).toBeUndefined();
    });

    it("asettaa sutil07 kun sekä osa että koko muuttuvat samaan aikaan", () => {
      const data = baseFormValues();
      data.kasittelynTila!.toteutusilmoitusOsittain = "2024-01-10";
      data.kasittelynTila!.toteutusilmoitusKokonaan = "2024-01-15";
      const defaults = baseFormValues();

      asetaKasittelynTilaAutomaatiolla(data, defaults, true, false);

      expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil07");
    });
  });

  it("asettaa sutil08 kun valitustenMaara asetetaan", () => {
    const data = baseFormValues();
    data.kasittelynTila!.valitustenMaara = 1 as any;
    const defaults = baseFormValues();

    asetaKasittelynTilaAutomaatiolla(data, defaults, true, false);

    expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil08");
  });

  it("asettaa sutil14 kun toimitusKaynnistynyt muuttuu", () => {
    const data = baseFormValues();
    data.kasittelynTila!.toimitusKaynnistynyt = "2024-01-15";
    const defaults = baseFormValues();

    asetaKasittelynTilaAutomaatiolla(data, defaults, true, false);

    expect(data.kasittelynTila!.suunnitelmanTila).toBe("suunnitelman-tila/sutil14");
  });

  it("ei muuta tilaa kun mitään ei muuteta", () => {
    const data = baseFormValues();
    const defaults = baseFormValues();

    asetaKasittelynTilaAutomaatiolla(data, defaults, true, false);

    expect(data.kasittelynTila!.suunnitelmanTila).toBeUndefined();
  });
});
