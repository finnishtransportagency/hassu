import { getAxios, wrapXRayAsync } from "../aws/monitoring";
import { s3Cache } from "../cache/s3Cache";
import { log } from "../logger";
import { BankHolidays } from "./bankHolidays";
import dayjs from "dayjs";
import { AxiosError } from "axios";
import { dateToString, nyt } from "../util/dateUtil";

export const BANK_HOLIDAYS_CACHE_KEY = "bankHolidays.json";
export const BANK_HOLIDAYS_CACHE_TTL_MILLIS = 365 * 24 * 60 * 60 * 1000; // one year

async function getBankHolidays(useCachedValue = true): Promise<BankHolidays> {
  try {
    return await wrapXRayAsync("getBankHolidays", async () => {
      const bankholidays: string[] = useCachedValue
        ? await s3Cache.get(
            BANK_HOLIDAYS_CACHE_KEY,
            BANK_HOLIDAYS_CACHE_TTL_MILLIS,
            async () => {
              await fetchBankHolidaysFromAPI();
            },
            async () => {
              return fetchBankHolidaysFromAPI();
            }
          )
        : await fetchBankHolidaysFromAPI();
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

  const currentYear = nyt().year();
  const rangeEndYear = currentYear + 2;
  const dates: string[] = [];
  for (let year = currentYear; year <= rangeEndYear; year++) {
    try {
      const response = await getAxios().request({
        baseURL: "https://api.boffsaopendata.fi/bankingcalendar/v1/api/v1/BankHolidays",
        params: { pageSize: 100, year },
        method: "GET",
      });
      dates.push(...response.data.specialDates.map((specialDate: SpecialDate) => dateToString(dayjs(specialDate.date, "DD.MM.YYYY"))));
    } catch (e) {
      const error = e as AxiosError;
      if (error.isAxiosError) {
        log.error(error.response?.status + " " + error.response?.statusText, { data: error.response?.data });
      }
      // ignore no data yet
      if (error.response?.status !== 400) {
        throw e;
      }
    }
  }
  log.debug("Bank holidays from API:", dates);
  if (dates.length === 0) {
    log.error("BankHolidays lataus epäonnistui");
  } else {
    await s3Cache.put(BANK_HOLIDAYS_CACHE_KEY, dates);
  }
  return dates;
}

export const bankHolidaysClient = { getBankHolidays };
