import dayjs, { Dayjs } from "dayjs";

import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const dateFormat = "YYYY-MM-DD";

export function parseDate(date: string) {
  return dayjs(date, dateFormat, true);
}

export function dateToString(date: Dayjs) {
  return date.format(dateFormat);
}
