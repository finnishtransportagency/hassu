import { LaskePaattymisPaivaQueryVariables } from "../../../common/graphql/apiModel";
import { dateToString, parseDate } from "../util/dateUtil";
import { Dayjs } from "dayjs";
import { bankHolidaysClient } from "./bankHolidaysClient";

export async function calculateEndDate({ alkupaiva }: LaskePaattymisPaivaQueryVariables) {
  const start = parseDate(alkupaiva);
  if (start.isValid()) {
    let endDate: Dayjs = start.add(1 + 30, "day");
    const bankHolidays = await bankHolidaysClient.getBankHolidays();
    while (bankHolidays.isBankHoliday(endDate)) {
      endDate = endDate.add(1, "day");
    }
    return dateToString(endDate);
  } else {
    throw new Error("Alkupäivän pitää olla muotoa YYYY-MM-DD");
  }
}
