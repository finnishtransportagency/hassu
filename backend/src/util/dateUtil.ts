import dayjs, { Dayjs, ManipulateType } from "dayjs";
import tz from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(tz);
dayjs.extend(customParseFormat);
const DEFAULT_TIMEZONE = "Europe/Helsinki";
process.env.TZ = DEFAULT_TIMEZONE;
dayjs.tz.setDefault(DEFAULT_TIMEZONE);

export type DateAddTuple = [number, ManipulateType];
export type DefaultTimeTo = "end-of-day" | "start-of-day";

export const ISO_DATE_FORMAT = "YYYY-MM-DD";

export function isDateStringLackingTimeElement(dateString: string): boolean {
  return dateString.length === ISO_DATE_FORMAT.length;
}

const DATE_TIME_FORMAT = "YYYY-MM-DDTHH:mm";

export function parseDate(dateString: string): Dayjs {
  let date: Dayjs;
  if (isDateStringLackingTimeElement(dateString)) {
    date = dayjs(dateString, ISO_DATE_FORMAT, true).tz(DEFAULT_TIMEZONE, true);
    if (date.isValid()) {
      return date;
    }
  }
  date = dayjs(dateString, DATE_TIME_FORMAT, true).tz(DEFAULT_TIMEZONE, true);
  if (date.isValid()) {
    return date;
  }
  return dayjs(dateString).tz(DEFAULT_TIMEZONE, true);
}

export function parseOptionalDate(dateString: string | undefined | null): Dayjs | undefined {
  if (!dateString) {
    return undefined;
  }
  return parseDate(dateString);
}

export function dateToString(date: Dayjs): string {
  return date.format(ISO_DATE_FORMAT);
}

export function dateTimeToString(date: Dayjs): string {
  return date.format(DATE_TIME_FORMAT);
}

export function localDateTimeString(): string {
  return dayjs().tz().format(DATE_TIME_FORMAT);
}

export function isDateTimeInThePast(
  dateString: string | undefined,
  defaultTimeTo: DefaultTimeTo,
  ...dateAddTuples: DateAddTuple[]
): boolean {
  const date = parseAndAddDateTime(dateString, defaultTimeTo, ...dateAddTuples);
  if (date) {
    return date.isBefore(dayjs());
  }
  return false;
}

export function parseAndAddDateTime(
  dateString: string | undefined,
  defaultTimeTo: DefaultTimeTo,
  ...dateAddTuples: DateAddTuple[]
): Dayjs | undefined {
  if (dateString) {
    let date = parseDate(dateString);
    dateAddTuples.forEach(([value, unit]) => {
      date = date.add(value, unit);
    });
    if (defaultTimeTo === "end-of-day" && isDateStringLackingTimeElement(dateString)) {
      date = date.endOf("day");
    }
    return date;
  }
}
