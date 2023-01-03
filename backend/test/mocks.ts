import mocha from "mocha";
import * as sinon from "sinon";
import { bankHolidaysClient } from "../src/endDateCalculator/bankHolidaysClient";
import { BankHolidays } from "../src/endDateCalculator/bankHolidays";

export function mockBankHolidays(): void {
  let bankHolidaysStub: sinon.SinonStub;
  mocha.before(() => {
    bankHolidaysStub = sinon.stub(bankHolidaysClient, "getBankHolidays");
  });
  mocha.beforeEach(() => {
    bankHolidaysStub.resolves(new BankHolidays([]));
  });
}
