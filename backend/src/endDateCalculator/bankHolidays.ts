import { Dayjs } from "dayjs";
import { parseDate } from "../util/dateUtil";

export class BankHolidays {
  private bankHolidays: Dayjs[];

  constructor(bankholidays: string[]) {
    this.bankHolidays = bankholidays.map(parseDate);
  }

  isBankHoliday(date: Dayjs): boolean {
    const pureDate = date.set("hours", 0).set("minutes", 0);
    const isWeekened = pureDate.day() === 0 || pureDate.day() === 6;
    return isWeekened || !!this.bankHolidays.find((bankHoliday) => bankHoliday.isSame(pureDate));
  }
}
