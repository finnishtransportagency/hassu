import { wrapXrayAsync } from "../aws/monitoring";
import { s3Cache } from "../cache/s3Cache";
import { log } from "../logger";
import { BankHolidays } from "./bankHolidays";
import dayjs from "dayjs";
import axios from "axios";
import { dateToString } from "../util/dateUtil";

export const BANK_HOLIDAYS_CACHE_KEY = "bankHolidays.json";
export const BANK_HOLIDAYS_CACHE_TTL_MILLIS = 365 * 24 * 60 * 60 * 1000; // one year

async function getBankHolidays(): Promise<BankHolidays> {
  try {
    return await wrapXrayAsync("getBankHolidays", async () => {
      const bankholidays: string[] = await s3Cache.get(
        BANK_HOLIDAYS_CACHE_KEY,
        BANK_HOLIDAYS_CACHE_TTL_MILLIS,
        async () => {
          await fetchBankHolidaysFromAPI();
        },
        async () => {
          return fetchBankHolidaysFromAPI();
        }
      );
      return new BankHolidays(bankholidays);
    });
  } catch (e) {
    log.error("getBankHolidays", { e });
    throw e;
  }
}

type SpecialDate = {
  date: string;
};

async function fetchBankHolidaysFromAPI() {
  // Fetch current year and two more as they are available in the API

  const currentYear = dayjs().year();
  const rangeEndYear = currentYear + 3;
  const dates: string[] = [];
  for (let year = currentYear; year <= rangeEndYear; year++) {
    try {
      const response = await axios.request({
        baseURL: "https://api.boffsaopendata.fi/bankingcalendar/v1/api/v1/BankHolidays",
        params: { pageSize: 100, year },
        method: "GET",
      });
      dates.push(
        ...response.data.specialDates.map((specialDate: SpecialDate) =>
          dateToString(dayjs(specialDate.date, "DD.MM.YYYY"))
        )
      );
    } catch (e) {
      if (e.isAxiosError) {
        log.error(e.status + " " + e.statusText, { data: e.response?.data });
      }
      throw e;
    }
  }
  log.debug("Bank holidays from API:", dates);
  await s3Cache.put(BANK_HOLIDAYS_CACHE_KEY, dates);
  return dates;
}

export const bankHolidaysClient = { getBankHolidays };
