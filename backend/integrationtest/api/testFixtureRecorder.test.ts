/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import { replaceFieldsByName } from "./testFixtureRecorder";

const { expect } = require("chai");

describe("testFixtureRecorder", () => {
  it("should replace dynamic data with static data successfully", () => {
    const data = {
      a: 1,
      b: 2,
      c: {
        a: 1,
        b: 2,
        d: {
          a: 1,
          b: 2,
          e: 3,
          f: null,
        },
      },
    };
    replaceFieldsByName(data, "***", "a", "b");
    expect(data).to.eql({
      a: "***",
      b: "***",
      c: {
        a: "***",
        b: "***",
        d: {
          a: "***",
          b: "***",
          e: 3,
          f: null,
        },
      },
    });
  });
});
