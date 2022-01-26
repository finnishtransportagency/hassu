import dayjs, { Dayjs } from "dayjs";

dayjs.extend(require("dayjs/plugin/customParseFormat"));

const dateFormat = "YYYY-MM-DD";

export function parseDate(date: string) {
  return dayjs(date, dateFormat, true);
}

export function dateToString(date: Dayjs) {
  return date.format(dateFormat);
}
