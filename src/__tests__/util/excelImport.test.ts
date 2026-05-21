// Contains code generated or recommended by Amazon Q
import { findColumnIndices, matchExcelRowsToOmistajat, getSheetIndexToRead } from "src/util/excelImport";

describe("excelImport", () => {
  describe("findColumnIndices", () => {
    it("finds header row with standard export format", () => {
      const rows = [
        ["Kuulutus suunnitelman nähtäville asettamisesta"],
        ["01.01.2024"],
        ["Kiinteistönomistajien tiedotus muilla tavoin"],
        ["Kiinteistötunnus", "Omistajan nimi", "Postiosoite", "Postinumero", "Postitoimipaikka", "Maa", "Tiedot haettu", "Tiedotustapa"],
        ["123-456-7-8", "Matti Meikäläinen", "Testikatu 1", "00100", "Helsinki", "Suomi", "01.01.2024", "Kirjeitse"],
      ];
      const result = findColumnIndices(rows);
      expect(result).not.toBeNull();
      expect(result!.kiinteistotunnus).toBe(0);
      expect(result!.nimi).toBe(1);
      expect(result!.postiosoite).toBe(2);
      expect(result!.postinumero).toBe(3);
      expect(result!.postitoimipaikka).toBe(4);
      expect(result!.headerRowIndex).toBe(3);
    });

    it("returns null when no header row found", () => {
      const rows = [["foo", "bar", "baz"], ["1", "2", "3"]];
      const result = findColumnIndices(rows);
      expect(result).toBeNull();
    });

    it("returns null for empty input", () => {
      const result = findColumnIndices([]);
      expect(result).toBeNull();
    });

    it("handles columns in different order", () => {
      const rows = [["Omistajan nimi", "Kiinteistötunnus", "Postitoimipaikka", "Postiosoite", "Postinumero"]];
      const result = findColumnIndices(rows);
      expect(result).not.toBeNull();
      expect(result!.kiinteistotunnus).toBe(1);
      expect(result!.nimi).toBe(0);
      expect(result!.postiosoite).toBe(3);
      expect(result!.postinumero).toBe(4);
      expect(result!.postitoimipaikka).toBe(2);
    });

    it("returns -1 for missing optional columns", () => {
      const rows = [["Kiinteistötunnus", "Omistajan nimi"]];
      const result = findColumnIndices(rows);
      expect(result).not.toBeNull();
      expect(result!.kiinteistotunnus).toBe(0);
      expect(result!.nimi).toBe(1);
      expect(result!.postiosoite).toBe(-1);
      expect(result!.postinumero).toBe(-1);
      expect(result!.postitoimipaikka).toBe(-1);
    });

    it("handles whitespace in header cells", () => {
      const rows = [["  Kiinteistötunnus  ", " Omistajan nimi ", " Postiosoite", "Postinumero ", "Postitoimipaikka"]];
      const result = findColumnIndices(rows);
      expect(result).not.toBeNull();
      expect(result!.kiinteistotunnus).toBe(0);
      expect(result!.nimi).toBe(1);
      expect(result!.postiosoite).toBe(2);
    });
  });

  describe("matchExcelRowsToOmistajat", () => {
    const columns = {
      kiinteistotunnus: 0,
      nimi: 1,
      postiosoite: 2,
      postinumero: 3,
      postitoimipaikka: 4,
      headerRowIndex: 0,
    };

    const rows = [
      ["Kiinteistötunnus", "Omistajan nimi", "Postiosoite", "Postinumero", "Postitoimipaikka"],
      ["123-456-7-8", "Matti Meikäläinen", "Testikatu 1", "00100", "Helsinki"],
      ["234-567-8-9", "Liisa Virtanen", "Esimerkkitie 5", "33100", "Tampere"],
      ["345-678-9-0", "Yritys Oy", "", "", ""],
    ];

    it("matches rows by kiinteistotunnus and nimi", () => {
      const omistajat = [
        { kiinteistotunnus: "123-456-7-8", nimi: "Matti Meikäläinen" },
        { kiinteistotunnus: "234-567-8-9", nimi: "Liisa Virtanen" },
      ];
      const results = matchExcelRowsToOmistajat(rows, columns, omistajat);
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ index: 0, jakeluosoite: "Testikatu 1", postinumero: "00100", paikkakunta: "Helsinki" });
      expect(results[1]).toEqual({ index: 1, jakeluosoite: "Esimerkkitie 5", postinumero: "33100", paikkakunta: "Tampere" });
    });

    it("does not match when kiinteistotunnus differs", () => {
      const omistajat = [{ kiinteistotunnus: "999-999-9-9", nimi: "Matti Meikäläinen" }];
      const results = matchExcelRowsToOmistajat(rows, columns, omistajat);
      expect(results).toHaveLength(0);
    });

    it("does not match when nimi differs", () => {
      const omistajat = [{ kiinteistotunnus: "123-456-7-8", nimi: "Väärä Nimi" }];
      const results = matchExcelRowsToOmistajat(rows, columns, omistajat);
      expect(results).toHaveLength(0);
    });

    it("includes rows with empty address data (Excel is source of truth)", () => {
      const omistajat = [{ kiinteistotunnus: "345-678-9-0", nimi: "Yritys Oy" }];
      const results = matchExcelRowsToOmistajat(rows, columns, omistajat);
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ index: 0, jakeluosoite: "", postinumero: "", paikkakunta: "" });
    });

    it("updates existing address data", () => {
      const omistajat = [
        { kiinteistotunnus: "123-456-7-8", nimi: "Matti Meikäläinen", jakeluosoite: "Vanha osoite", postinumero: "99999", paikkakunta: "Vanha" },
      ];
      const results = matchExcelRowsToOmistajat(rows, columns, omistajat);
      expect(results).toHaveLength(1);
      expect(results[0].jakeluosoite).toBe("Testikatu 1");
      expect(results[0].postinumero).toBe("00100");
      expect(results[0].paikkakunta).toBe("Helsinki");
    });

    it("handles null/undefined kiinteistotunnus and nimi in omistajat", () => {
      const omistajat = [
        { kiinteistotunnus: null, nimi: null },
        { kiinteistotunnus: undefined, nimi: undefined },
      ];
      const results = matchExcelRowsToOmistajat(rows, columns, omistajat);
      expect(results).toHaveLength(0);
    });

    it("preserves correct index in results", () => {
      const omistajat = [
        { kiinteistotunnus: "999-999-9-9", nimi: "Ei löydy" },
        { kiinteistotunnus: "234-567-8-9", nimi: "Liisa Virtanen" },
        { kiinteistotunnus: "123-456-7-8", nimi: "Matti Meikäläinen" },
      ];
      const results = matchExcelRowsToOmistajat(rows, columns, omistajat);
      expect(results).toHaveLength(2);
      expect(results[0].index).toBe(1);
      expect(results[1].index).toBe(2);
    });
  });

  describe("getSheetIndexToRead", () => {
    it("returns 1 for single sheet", () => {
      expect(getSheetIndexToRead(["Muut kiinteistönomistajat"])).toBe(1);
    });

    it("returns 'Muut kiinteistönomistajat' sheet index for multiple sheets", () => {
      expect(getSheetIndexToRead(["Suomi.fi kiinteistönomistajat", "Muut kiinteistönomistajat"])).toBe(2);
    });

    it("returns 1 as fallback if 'Muut kiinteistönomistajat' not found in multiple sheets", () => {
      expect(getSheetIndexToRead(["Sheet1", "Sheet2"])).toBe(1);
    });

    it("handles sheet name in different position", () => {
      expect(getSheetIndexToRead(["Muut kiinteistönomistajat", "Suomi.fi kiinteistönomistajat"])).toBe(1);
    });
  });
});
