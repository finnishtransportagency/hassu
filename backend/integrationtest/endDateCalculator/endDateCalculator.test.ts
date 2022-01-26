/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { api } from "../api/apiClient";
import { LaskuriTyyppi } from "../../../common/graphql/apiModel";

const { expect } = require("chai");

describe("EndDateCalculator", () => {
  it("should calculate correct end date", async () => {
    expect(await api.laskePaattymisPaiva("2022-11-02", LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA)).to.be.equal(
      "2022-12-05"
    );
  });
});
