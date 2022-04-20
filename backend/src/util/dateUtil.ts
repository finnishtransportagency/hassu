import dayjs, { Dayjs } from "dayjs";
import tz from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(tz);
dayjs.extend(customParseFormat);
const DEFAULT_TIMEZONE = "Europe/Helsinki";
process.env.TZ = DEFAULT_TIMEZONE;
dayjs.tz.setDefault(DEFAULT_TIMEZONE);

export const ISO_DATE_FORMAT = "YYYY-MM-DD";
const DATE_TIME_FORMAT = "YYYY-MM-DDTHH:mm";

export function parseDate(date: string): Dayjs {
  let d: Dayjs;
  if (date.length == ISO_DATE_FORMAT.length) {
    d = dayjs(date, ISO_DATE_FORMAT, true).tz(DEFAULT_TIMEZONE, true);
    if (d.isValid()) {
      return d;
    }
  }
  d = dayjs(date, DATE_TIME_FORMAT, true).tz(DEFAULT_TIMEZONE, true);
  if (d.isValid()) {
    return d;
  }
  return dayjs(date).tz(DEFAULT_TIMEZONE, true);
}

export function dateToString(date: Dayjs) {
  return date.format(ISO_DATE_FORMAT);
}

export function dateTimeToString(date: Dayjs) {
  return date.format(DATE_TIME_FORMAT);
}

export function localDateTimeString() {
  return dayjs().tz().format(DATE_TIME_FORMAT);
}
