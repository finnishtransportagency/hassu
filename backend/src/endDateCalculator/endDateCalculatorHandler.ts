import { LaskePaattymisPaivaQueryVariables, LaskuriTyyppi } from "hassu-common/graphql/apiModel";
import { dateTimeToString, dateToString, ISO_DATE_FORMAT, parseDate } from "../util/dateUtil";
import { Dayjs } from "dayjs";
import { bankHolidaysClient } from "./bankHolidaysClient";
import { config } from "../config";

export async function calculateEndDate({ alkupaiva, tyyppi }: LaskePaattymisPaivaQueryVariables): Promise<string> {
  switch (tyyppi) {
    case LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA:
    case LaskuriTyyppi.NAHTAVILLAOLON_KUULUTUKSEN_PAATTYMISPAIVA:
      return calculateOnePlusGivenDaysSkipHolidays(alkupaiva, 30);
    case LaskuriTyyppi.HYVAKSYMISPAATOKSEN_KUULUTUSAIKA:
      return calculateOnePlusGivenDaysSkipHolidays(alkupaiva, 7 + 30); // julkaisupäivä + 7 päivän tiedoksisaantiaika + 30 päivän muutoksenhakuaika
  }
}

async function calculateOnePlusGivenDaysSkipHolidays(alkupaiva: string, days: number) {
  let start: Dayjs;
  // Only accept dates in prod, but allow datetimes in other environments
  const isDateOnly = config.isProd() || alkupaiva.length == ISO_DATE_FORMAT.length;
  if (isDateOnly) {
    start = parseDate(alkupaiva);
    if (!start.isValid()) {
      throw new Error("Alkupäivän pitää olla muotoa YYYY-MM-DD tai YYYY-MM-DDTHH:mm");
    }
  } else {
    start = parseDate(alkupaiva);
    if (!start.isValid()) {
      throw new Error("Alkupäivän pitää olla muotoa YYYY-MM-DDTHH:mm");
    }
  }
  let endDate: Dayjs = start.add(days, "day");
  const bankHolidays = await bankHolidaysClient.getBankHolidays();
  while (bankHolidays.isBankHoliday(endDate)) {
    endDate = endDate.add(1, "day");
  }
  if (isDateOnly) {
    return dateToString(endDate);
  } else {
    return dateTimeToString(endDate);
  }
}
