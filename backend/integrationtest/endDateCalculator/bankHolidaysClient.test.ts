/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { bankHolidaysClient } from "../../src/endDateCalculator/bankHolidaysClient";
import dayjs from "dayjs";
import * as sinon from "sinon";
import { nyt } from "../../src/util/dateUtil";

import { expect } from "chai";
import { AxiosError } from "axios";

describe("BankHolidaysClient", () => {
  after(() => {
    sinon.restore();
  });

  it("should fetch bank holidays from public API", async () => {
    try {
      const bankHolidays = await bankHolidaysClient.getBankHolidays(false);
      expect(bankHolidays.isBankHoliday(dayjs(nyt().year() + "-12-24"))).to.be.true;
    } catch (e) {
      const error = e as AxiosError;
      // Vuoden vaihteessa saattaa tulla kahden vuoden päähän 400 virhettä "Year out of range"
      if (!error.isAxiosError && error.response?.data !== "Year out of range.") {
        throw e;
      }
    }
  });
});
