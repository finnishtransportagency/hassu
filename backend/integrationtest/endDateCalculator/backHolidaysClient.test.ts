/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { bankHolidaysClient } from "../../src/endDateCalculator/bankHolidaysClient";
import dayjs from "dayjs";
import * as sinon from "sinon";

const { expect } = require("chai");

describe("BackHolidaysClient", () => {
  after(() => {
    sinon.restore();
  });

  it("should fetch bank holidays from public API", async () => {
    const bankHolidays = await bankHolidaysClient.getBankHolidays();
    expect(bankHolidays.isBankHoliday(dayjs(dayjs().year() + "-12-24"))).to.be.true;
  });
});
