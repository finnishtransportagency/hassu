/**
 * @jest-environment jsdom
 */

import dayjs from "dayjs";
import { today } from "../../../common/util/dateUtils";
import { haePalauteKyselyTiedot, PalauteKyselyAvoinna, PalauteKyselyTiedot } from "../../util/haePalauteKyselyTiedot";

const ONLY_DATE_FORMAT = "YYYY-MM-DD";
const DAY = "day";
const HREF_WEB_URL = 'foo-bar';

describe("isPalauteKyselyAvoinna", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_PALAUTE_KYSELY_TIEDOT; // Reset after each test
  });

  it("current date is between start and end dates", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const endDate = dayjs(NOW).add(1, DAY).format(ONLY_DATE_FORMAT);
    const startDate = dayjs(NOW).subtract(1, DAY).format(ONLY_DATE_FORMAT);
    const PALAUTE_KYSELY_TIEDOT: PalauteKyselyTiedot = {
      href: HREF_WEB_URL,
      startDate,
      endDate
    };
    process.env.NEXT_PUBLIC_PALAUTE_KYSELY_TIEDOT = JSON.stringify(PALAUTE_KYSELY_TIEDOT);
    const result: PalauteKyselyAvoinna = haePalauteKyselyTiedot();
    expect(result.isActive).toBe(true);
    expect(result.href).toBe(HREF_WEB_URL);
  });

  it("current date is before start and end dates", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const endDate = dayjs(NOW).add(3, DAY).format(ONLY_DATE_FORMAT);
    const startDate = dayjs(NOW).add(1, DAY).format(ONLY_DATE_FORMAT);
    const PALAUTE_KYSELY_TIEDOT: PalauteKyselyTiedot = {
      href: HREF_WEB_URL,
      startDate,
      endDate,
    };
    process.env.NEXT_PUBLIC_PALAUTE_KYSELY_TIEDOT = JSON.stringify(PALAUTE_KYSELY_TIEDOT);
    const result: PalauteKyselyAvoinna = haePalauteKyselyTiedot();
    expect(result.isActive).toBe(false);
    expect(result.href).toBe(HREF_WEB_URL);
  });

  it("current date is after start and end dates", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const endDate = dayjs(NOW).subtract(1, DAY).format(ONLY_DATE_FORMAT);;
    const startDate = dayjs(NOW).subtract(4, DAY).format(ONLY_DATE_FORMAT);;
    const PALAUTE_KYSELY_TIEDOT: PalauteKyselyTiedot = {
      href: HREF_WEB_URL,
      startDate,
      endDate
    };
    process.env.NEXT_PUBLIC_PALAUTE_KYSELY_TIEDOT = JSON.stringify(PALAUTE_KYSELY_TIEDOT);
    const result: PalauteKyselyAvoinna = haePalauteKyselyTiedot();
    expect(result.isActive).toBe(false);
    expect(result.href).toBe(HREF_WEB_URL);
  });

  it("environment variable is undefined string", () => {
    const PALAUTE_KYSELY_TIEDOT = '';
    process.env.NEXT_PUBLIC_PALAUTE_KYSELY_TIEDOT = JSON.stringify(PALAUTE_KYSELY_TIEDOT);
    const result: PalauteKyselyAvoinna = haePalauteKyselyTiedot();
    expect(result.isActive).toBe(false);
    expect(result.href).toBe(undefined);
  });

  it("current date is same as start date, exp result true", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const endDate = dayjs(NOW).add(2, DAY).format(ONLY_DATE_FORMAT);;
    const startDate = dayjs(NOW).format(ONLY_DATE_FORMAT);;
    const PALAUTE_KYSELY_TIEDOT = {
      href: HREF_WEB_URL,
      startDate,
      endDate
    };
    process.env.NEXT_PUBLIC_PALAUTE_KYSELY_TIEDOT = JSON.stringify(PALAUTE_KYSELY_TIEDOT);
    const result: PalauteKyselyAvoinna = haePalauteKyselyTiedot();
    expect(result.isActive).toBe(true);
    expect(result.href).toBe(HREF_WEB_URL);
  });

  it("current date is same as end date, exp result true", () => {
    const NOW = today().format(ONLY_DATE_FORMAT);
    const endDate = dayjs(NOW).format(ONLY_DATE_FORMAT);
    const startDate = dayjs(NOW).subtract(2, DAY).format(ONLY_DATE_FORMAT);
    const PALAUTE_KYSELY_TIEDOT = {
      href: HREF_WEB_URL,
      startDate,
      endDate
    };
    process.env.NEXT_PUBLIC_PALAUTE_KYSELY_TIEDOT = JSON.stringify(PALAUTE_KYSELY_TIEDOT);
    const result: PalauteKyselyAvoinna = haePalauteKyselyTiedot();
    expect(result.isActive).toBe(true);
    expect(result.href).toBe(HREF_WEB_URL);
  });

});
