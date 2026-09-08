import { expect } from "chai";
import { formatKiinteistotunnusForDatabase, formatKiinteistotunnusForDisplay } from "hassu-common/util/formatKiinteistotunnus";

describe("formatKiinteistotunnus", () => {
  describe("formatKiinteistotunnusForDatabase", () => {
    it("should convert display format to database format", () => {
      expect(formatKiinteistotunnusForDatabase("091-123-0001-0001")).to.equal("09112300010001");
    });

    it("should pad short parts with leading zeros", () => {
      expect(formatKiinteistotunnusForDatabase("1-1-1-1")).to.equal("00100100010001");
      expect(formatKiinteistotunnusForDatabase("740-555-2-0")).to.equal("74055500020000");
    });

    it("should handle input without leading zeros", () => {
      expect(formatKiinteistotunnusForDatabase("91-123-1-1")).to.equal("09112300010001");
    });

    it("should return undefined for empty input", () => {
      expect(formatKiinteistotunnusForDatabase(undefined)).to.be.undefined;
      expect(formatKiinteistotunnusForDatabase(null)).to.be.undefined;
      expect(formatKiinteistotunnusForDatabase("")).to.be.undefined;
    });

    it("should throw for wrong number of parts", () => {
      expect(() => formatKiinteistotunnusForDatabase("091-123-0001")).to.throw("Virheellinen kiinteistötunnus");
      expect(() => formatKiinteistotunnusForDatabase("091-123-0001-0001-0001")).to.throw("Virheellinen kiinteistötunnus");
    });

    it("should throw for non-numeric parts", () => {
      expect(() => formatKiinteistotunnusForDatabase("abc-123-0001-0001")).to.throw("Virheellinen kiinteistötunnus");
      expect(() => formatKiinteistotunnusForDatabase("091-abc-0001-0001")).to.throw("Virheellinen kiinteistötunnus");
    });
  });

  describe("formatKiinteistotunnusForDisplay", () => {
    it("should convert database format to display format", () => {
      expect(formatKiinteistotunnusForDisplay("09112300010001")).to.equal("91-123-1-1");
    });

    it("should strip leading zeros in display", () => {
      expect(formatKiinteistotunnusForDisplay("00100100010001")).to.equal("1-1-1-1");
      expect(formatKiinteistotunnusForDisplay("74055500020000")).to.equal("740-555-2-0");
    });

    it("should return empty string for empty input", () => {
      expect(formatKiinteistotunnusForDisplay(undefined)).to.equal("");
      expect(formatKiinteistotunnusForDisplay(null)).to.equal("");
    });

    it("roundtrip: database -> display -> database should be stable", () => {
      const db = "09112300010001";
      const display = formatKiinteistotunnusForDisplay(db);
      expect(formatKiinteistotunnusForDatabase(display)).to.equal(db);
    });

    it("roundtrip: display -> database -> display should be stable", () => {
      const display = "91-123-1-1";
      const db = formatKiinteistotunnusForDatabase(display)!;
      expect(formatKiinteistotunnusForDisplay(db)).to.equal(display);
    });
  });
});
