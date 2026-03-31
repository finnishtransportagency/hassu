// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import { expect } from "chai";
import { createJulkaisuSortKey } from "../../src/database/julkaisuItemKeys";

describe("createJulkaisuSortKey", () => {
  it("should pad single digit id to 3 digits", () => {
    expect(createJulkaisuSortKey("JULKAISU#HYVAKSYMISPAATOS#", 1)).to.equal("JULKAISU#HYVAKSYMISPAATOS#001");
  });

  it("should pad double digit id to 3 digits", () => {
    expect(createJulkaisuSortKey("JULKAISU#JATKOPAATOS1#", 42)).to.equal("JULKAISU#JATKOPAATOS1#042");
  });

  it("should not pad triple digit id", () => {
    expect(createJulkaisuSortKey("JULKAISU#JATKOPAATOS2#", 100)).to.equal("JULKAISU#JATKOPAATOS2#100");
  });

  it("should work with all prefix types", () => {
    expect(createJulkaisuSortKey("JULKAISU#HYVAKSYMISPAATOS#", 1)).to.match(/^JULKAISU#HYVAKSYMISPAATOS#/);
    expect(createJulkaisuSortKey("JULKAISU#JATKOPAATOS1#", 1)).to.match(/^JULKAISU#JATKOPAATOS1#/);
    expect(createJulkaisuSortKey("JULKAISU#JATKOPAATOS2#", 1)).to.match(/^JULKAISU#JATKOPAATOS2#/);
  });
});
