/* tslint:disable:no-unused-expression */
import { expect } from "chai";
import { describe, it } from "mocha";
import { authenticate } from "../../src/velho/velhoClient";

describe("VelhoClient", () => {
  it("should authenticate to Velho", async () => {
    expect(await authenticate()).not.be.null;
  });
});
