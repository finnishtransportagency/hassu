/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { LaskuriTyyppi } from "../../../common/graphql/apiModel";
import { calculateEndDate } from "../../src/endDateCalculator/endDateCalculatorHandler";

const { expect } = require("chai");

describe.only("Api", () => {
  it("should calculate correct end date", async () => {
    expect(
      await calculateEndDate({ alkupaiva: "2100-12-24", tyyppi: LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA })
    ).to.be.equal("2100-12-31");
  });
});
