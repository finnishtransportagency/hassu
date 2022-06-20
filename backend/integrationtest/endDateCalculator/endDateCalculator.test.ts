/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { api } from "../api/apiClient";
import { LaskuriTyyppi } from "../../../common/graphql/apiModel";

const { expect } = require("chai");

describe("EndDateCalculator", () => {
  it("should calculate correct end date (KUULUTUKSEN_PAATTYMISPAIVA)", async () => {
    expect(await api.laskePaattymisPaiva("2022-11-03", LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA)).to.be.equal(
      "2022-12-05"
    );
  });
  it("should calculate correct end date (NAHTAVILLAOLON_KUULUTUKSEN_PAATTYMISPAIVA)", async () => {
    expect(await api.laskePaattymisPaiva("2022-11-03", LaskuriTyyppi.NAHTAVILLAOLON_KUULUTUKSEN_PAATTYMISPAIVA)).to.be.equal(
      "2022-12-05"
    );
  });
});
