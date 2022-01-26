/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { api } from "../api/apiClient";
import { LaskuriTyyppi } from "../../../common/graphql/apiModel";

const { expect } = require("chai");

describe("Api", () => {
  it("should calculate correct end date", async () => {
    expect(await api.laskePaattymisPaiva("2100-12-24", LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA)).to.be.equal(
      "2100-12-31"
    );
  });
});
