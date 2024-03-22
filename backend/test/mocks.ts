import mocha from "mocha";
import * as sinon from "sinon";
import { bankHolidaysClient } from "../src/endDateCalculator/bankHolidaysClient";
import { BankHolidays } from "../src/endDateCalculator/bankHolidays";
import { SchedulerMock } from "../integrationtest/api/testUtil/util";
import { parameters } from "../src/aws/parameters";
import MockDate from "mockdate";
import { mockUUID } from "../integrationtest/shared/sharedMock";
import { EventSqsClientMock } from "../integrationtest/api/testUtil/eventSqsClientMock";

export function mockBankHolidays(): void {
  let bankHolidaysStub: sinon.SinonStub;
  mocha.before(() => {
    bankHolidaysStub = sinon.stub(bankHolidaysClient, "getBankHolidays");
  });
  mocha.beforeEach(() => {
    bankHolidaysStub.resolves(new BankHolidays([]));
  });
}

export function mockParameters(): void {
  let getRequiredInfraParameterStub: sinon.SinonStub;
  let getParameterStub: sinon.SinonStub;
  mocha.before(() => {
    getRequiredInfraParameterStub = sinon.stub(parameters, "getRequiredInfraParameter");
    getParameterStub = sinon.stub(parameters, "getParameter");
  });
  mocha.beforeEach(() => {
    getRequiredInfraParameterStub.callsFake((paramName) => {
      return "getRequiredInfraParameterValue_" + paramName;
    });
    getParameterStub.callsFake((paramName) => {
      if (paramName == "AsianhallintaIntegrationEnabled") {
        return "false";
      }
      return "getParameterValue_" + paramName;
    });
  });
}

export function defaultUnitTestMocks(): void {
  mockBankHolidays();
  new SchedulerMock();
  new EventSqsClientMock();
  mockParameters();
  setupMockDate();
  mockUUID();
}

function setupMockDate() {
  mocha.beforeEach(() => {
    MockDate.set("2020-01-01");
  });
  mocha.after(() => {
    MockDate.reset();
  });
}
