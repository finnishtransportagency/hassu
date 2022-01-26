import { Dayjs } from "dayjs";
import { parseDate } from "../util/dateUtil";

export class BankHolidays {
  private bankHolidays: Dayjs[];

  constructor(bankholidays: string[]) {
    this.bankHolidays = bankholidays.map(parseDate);
  }

  isBankHoliday(date: Dayjs) {
    const isWeekened = date.day() === 0 || date.day() === 6;
    return isWeekened || !!this.bankHolidays.find((bankHoliday) => bankHoliday.isSame(date));
  }
}
