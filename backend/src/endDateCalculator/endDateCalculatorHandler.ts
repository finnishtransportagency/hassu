import { LaskePaattymisPaivaQueryVariables } from "../../../common/graphql/apiModel";
import { dateTimeToString, dateToString, ISO_DATE_FORMAT, parseDate } from "../util/dateUtil";
import { Dayjs } from "dayjs";
import { bankHolidaysClient } from "./bankHolidaysClient";
import { config } from "../config";

export async function calculateEndDate({
  alkupaiva,
  tyyppi: _tyyppi,
}: LaskePaattymisPaivaQueryVariables): Promise<string> {
  // Calculator currectly has only two types (KUULUTUKSEN_PAATTYMISPAIVA, NAHTAVILLAOLON_KUULUTUKSEN_PAATTYMISPAIVA) and they are calculated with equal formula
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
  let endDate: Dayjs = start.add(30, "day");
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
