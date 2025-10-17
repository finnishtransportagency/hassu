/**
 * @jest-environment jsdom
 */

import dayjs from "dayjs";
import { today } from "../../../common/util/dateUtils";
import { isEvkAktivoitu } from "../isEvkAktivoitu";
import { expect } from "chai";

const ONLY_DATE_FORMAT = "YYYY-MM-DD";
const DAY = "day";

describe("isEvkAktivoitu", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE; // Reset after each test
  });

  it("current date is before EVK activation date", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(NOW).add(1, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE);
    const isActive = isEvkAktivoitu();
    expect(isActive).to.be.false;
  });

  it("current date is after EVK activation date", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(NOW).subtract(4, DAY).format(ONLY_DATE_FORMAT);;
    const EVK_ACTIVATION_DATE = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE);
    const isActive = isEvkAktivoitu();
    expect(isActive).to.be.true;
  });

  it("environment variable is undefined string", () => {
    const EVK_ACTIVATION_DATE = '';
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE);
    const isActive = isEvkAktivoitu();
    expect(isActive).to.be.false;
  });

  it("current date is the same day as EVK activation date, exp result true", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(NOW).format(ONLY_DATE_FORMAT);;
    const EVK_ACTIVATION_DATE = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE);
    const isActive = isEvkAktivoitu();
    expect(isActive).to.be.true;
  });

});
