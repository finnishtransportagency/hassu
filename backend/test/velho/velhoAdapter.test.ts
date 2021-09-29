/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { adaptProjecti } from "../../src/velho/velhoAdapter";
// @ts-ignore
import { default as velhoTieProjecti } from "./fixture/velhoTieProjekti.json";

const { expect } = require("chai");

describe("VelhoAdapter", () => {
  it("should adapt project from Velho successfully", async () => {
    expect(adaptProjecti(velhoTieProjecti.data as any)).toMatchSnapshot();
  });
});
