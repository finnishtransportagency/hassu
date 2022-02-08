import { describe, it } from "mocha";
import { adaptProjekti } from "../../src/velho/velhoAdapter";
import { default as velhoTieProjecti } from "./fixture/velhoTieProjekti.json";

const { expect } = require("chai");

describe("VelhoAdapter", () => {
  it("should adapt project from Velho successfully", async () => {
    expect(adaptProjekti(velhoTieProjecti.data as any)).toMatchSnapshot();
  });
});
