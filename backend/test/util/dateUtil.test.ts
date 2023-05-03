import { describe, it } from "mocha";
import { parseDate } from "../../src/util/dateUtil";
import { expect } from "chai";

describe("dateUtil", () => {
  it("should parse date succesfully", function () {
    expect(parseDate("2042-06-07T23:59:59+03:00").format()).to.eq("2042-06-07T23:59:59+03:00");
    expect(parseDate("2042-06-07T23:59").format()).to.eq("2042-06-07T23:59:00+03:00");
    expect(parseDate("2042-06-07").format()).to.eq("2042-06-07T00:00:00+03:00");
  });
});
