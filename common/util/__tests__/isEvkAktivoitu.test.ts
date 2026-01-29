/**
 * @jest-environment jsdom
 */

import dayjs from "dayjs";
import { today } from "../../../common/util/dateUtils";
import { isEvkAktivoitu, isEvkAktivoituAt } from "../isEvkAktivoitu";
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
    const startDate = dayjs(NOW).subtract(4, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE);
    const isActive = isEvkAktivoitu();
    expect(isActive).to.be.true;
  });

  it("environment variable is undefined string", () => {
    const EVK_ACTIVATION_DATE = "";
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE);
    const isActive = isEvkAktivoitu();
    expect(isActive).to.be.false;
  });

  it("current date is the same day as EVK activation date, exp result true", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(NOW).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE);
    const isActive = isEvkAktivoitu();
    expect(isActive).to.be.true;
  });

  it("environment variable is double-escaped string and current date is after EVK activation date", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(NOW).subtract(4, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE = {
      startDate,
    };
    // simulate how it appears in process.env
    const doubleEscapedEnvVariable = JSON.stringify(JSON.stringify(EVK_ACTIVATION_DATE));
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = doubleEscapedEnvVariable.slice(1, -1); // removes outer quotes
    const isActive = isEvkAktivoitu();
    expect(isActive).to.be.true;
  });

  it("environment variable is double-escaped string and current date is after EVK activation date", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(NOW).subtract(4, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE = {
      startDate,
    };
    // simulate how it appears in process.env
    const doubleEscapedEnvVariable = JSON.stringify(JSON.stringify(EVK_ACTIVATION_DATE));
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = doubleEscapedEnvVariable.slice(1, -1); // removes outer quotes
    const isActive = isEvkAktivoitu();
    expect(isActive).to.be.true;
  });

  it("environment variable is double-escaped string and current date is the same day as EVK activation date, exp result true", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(NOW).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE = {
      startDate,
    };
    // simulate how it appears in process.env
    const doubleEscapedEnvVariable = JSON.stringify(JSON.stringify(EVK_ACTIVATION_DATE));
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = doubleEscapedEnvVariable.slice(1, -1); // removes outer quotes
    const isActive = isEvkAktivoitu();
    expect(isActive).to.be.true;
  });
});

describe("isEvkAktivoituAt", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE; // Reset after each test
  });

  it("given date is before EVK activation date", () => {
    const DATE_TO_COMPARE = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_COMPARE).add(1, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE);
    const isActive = isEvkAktivoituAt(DATE_TO_COMPARE);
    expect(isActive).to.be.false;
  });

  it("given date is after EVK activation date", () => {
    const DATE_TO_COMPARE = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_COMPARE).subtract(4, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE);
    const isActive = isEvkAktivoituAt(DATE_TO_COMPARE);
    expect(isActive).to.be.true;
  });

  it("environment variable is undefined string", () => {
    const EVK_ACTIVATION_DATE = "";
    const DATE_TO_COMPARE = today().format(ONLY_DATE_FORMAT);
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE);
    const isActive = isEvkAktivoituAt(DATE_TO_COMPARE);
    expect(isActive).to.be.false;
  });

  it("given date is the same day as EVK activation date, exp result true", () => {
    const DATE_TO_COMPARE = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_COMPARE).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE = {
      startDate,
    };
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = JSON.stringify(EVK_ACTIVATION_DATE);
    const isActive = isEvkAktivoituAt(DATE_TO_COMPARE);
    expect(isActive).to.be.true;
  });

  it("environment variable is double-escaped string and given date is after EVK activation date", () => {
    const DATE_TO_COMPARE = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_COMPARE).subtract(4, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE = {
      startDate,
    };
    // simulate how it appears in process.env
    const doubleEscapedEnvVariable = JSON.stringify(JSON.stringify(EVK_ACTIVATION_DATE));
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = doubleEscapedEnvVariable.slice(1, -1); // removes outer quotes
    const isActive = isEvkAktivoituAt(DATE_TO_COMPARE);
    expect(isActive).to.be.true;
  });

  it("environment variable is double-escaped string and given date is after EVK activation date", () => {
    const DATE_TO_COMPARE = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_COMPARE).subtract(4, DAY).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE = {
      startDate,
    };
    // simulate how it appears in process.env
    const doubleEscapedEnvVariable = JSON.stringify(JSON.stringify(EVK_ACTIVATION_DATE));
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = doubleEscapedEnvVariable.slice(1, -1); // removes outer quotes
    const isActive = isEvkAktivoituAt(DATE_TO_COMPARE);
    expect(isActive).to.be.true;
  });

  it("environment variable is double-escaped string and given date is the same day as EVK activation date, exp result true", () => {
    const DATE_TO_COMPARE = today().format(ONLY_DATE_FORMAT);
    const startDate = dayjs(DATE_TO_COMPARE).format(ONLY_DATE_FORMAT);
    const EVK_ACTIVATION_DATE = {
      startDate,
    };
    // simulate how it appears in process.env
    const doubleEscapedEnvVariable = JSON.stringify(JSON.stringify(EVK_ACTIVATION_DATE));
    process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE = doubleEscapedEnvVariable.slice(1, -1); // removes outer quotes
    const isActive = isEvkAktivoituAt(DATE_TO_COMPARE);
    expect(isActive).to.be.true;
  });
});
