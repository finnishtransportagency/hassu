/* tslint:disable:no-unused-expression */
import { expect } from "chai";
import { describe, it } from "mocha";
import { velho } from "../../src/velho/velhoClient";

describe("VelhoClient", () => {
  it("should authenticate to Velho", async () => {
    expect(await velho.authenticate()).not.be.null;
  });
});
