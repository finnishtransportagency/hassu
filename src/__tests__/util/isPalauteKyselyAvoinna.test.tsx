/**
 * @jest-environment jsdom
 */

import dayjs from "dayjs";
import { today } from "../../../common/util/dateUtils";
import isPalauteKyselyAvoinna from "../../../src/util/isPalauteKyselyAvoinna";

const ONLY_DATE_FORMAT = 'YYYY-MM-DD';
const DAY = 'day';

describe("isPalauteKyselyAvoinna", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_PALAUTE_KYSELY_AVOINNA; // Reset after each test
  });

  it("current date is between start and end dates", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const endDate = dayjs(NOW).add(1, DAY).format(ONLY_DATE_FORMAT);;
    const startDate = dayjs(NOW).subtract(1, DAY).format(ONLY_DATE_FORMAT);;
    const KYSELY_AVOINNA_DATES = {
      startDate,
      endDate
    };
    process.env.NEXT_PUBLIC_PALAUTE_KYSELY_AVOINNA = JSON.stringify(KYSELY_AVOINNA_DATES);
    expect(isPalauteKyselyAvoinna()).toBe(true);
  });

  it("current date is before start and end dates", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const endDate = dayjs(NOW).add(3, DAY).format(ONLY_DATE_FORMAT);;
    const startDate = dayjs(NOW).add(1, DAY).format(ONLY_DATE_FORMAT);;
    const KYSELY_AVOINNA_DATES = {
      startDate,
      endDate
    };
    process.env.NEXT_PUBLIC_PALAUTE_KYSELY_AVOINNA = JSON.stringify(KYSELY_AVOINNA_DATES);
    expect(isPalauteKyselyAvoinna()).toBe(false);
  });

  it("current date is after start and end dates", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const endDate = dayjs(NOW).subtract(1, DAY).format(ONLY_DATE_FORMAT);;
    const startDate = dayjs(NOW).subtract(4, DAY).format(ONLY_DATE_FORMAT);;
    const KYSELY_AVOINNA_DATES = {
      startDate,
      endDate
    };
    process.env.NEXT_PUBLIC_PALAUTE_KYSELY_AVOINNA = JSON.stringify(KYSELY_AVOINNA_DATES);
    expect(isPalauteKyselyAvoinna()).toBe(false);
  });

  it("environment variable is undefined string", () => {
    const KYSELY_AVOINNA_DATES = '';
    process.env.NEXT_PUBLIC_PALAUTE_KYSELY_AVOINNA = JSON.stringify(KYSELY_AVOINNA_DATES);
    expect(isPalauteKyselyAvoinna()).toBe(false);
  });

  it("current date is same as start date, exp result true", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const endDate = dayjs(NOW).add(2, DAY).format(ONLY_DATE_FORMAT);;
    const startDate = dayjs(NOW).format(ONLY_DATE_FORMAT);;
    const KYSELY_AVOINNA_DATES = {
      startDate,
      endDate
    };
    process.env.NEXT_PUBLIC_PALAUTE_KYSELY_AVOINNA = JSON.stringify(KYSELY_AVOINNA_DATES);
    expect(isPalauteKyselyAvoinna()).toBe(true);
  });

  it("current date is same as end date, exp result true", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const endDate = dayjs(NOW).format(ONLY_DATE_FORMAT);
    const startDate = dayjs(NOW).subtract(2, DAY).format(ONLY_DATE_FORMAT);
    const KYSELY_AVOINNA_DATES = {
      startDate,
      endDate
    };
    process.env.NEXT_PUBLIC_PALAUTE_KYSELY_AVOINNA = JSON.stringify(KYSELY_AVOINNA_DATES);
    expect(isPalauteKyselyAvoinna()).toBe(true);
  });

});
