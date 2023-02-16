import { Dayjs } from "dayjs";
import { dateToString } from "../util/dateUtil";

export class BankHolidays {
  private bankHolidays: string[];

  constructor(bankholidays: string[]) {
    this.bankHolidays = bankholidays;
  }

  isBankHoliday(date: Dayjs): boolean {
    const dateStr = dateToString(date);
    const isWeekened = date.day() === 0 || date.day() === 6;
    return (
      isWeekened ||
      !!this.bankHolidays.find((bankHoliday) => {
        return bankHoliday == dateStr;
      })
    );
  }
}
