import mocha from "mocha";
import * as sinon from "sinon";
import { bankHolidaysClient } from "../src/endDateCalculator/bankHolidaysClient";
import { BankHolidays } from "../src/endDateCalculator/bankHolidays";
import { SchedulerMock } from "../integrationtest/api/testUtil/util";
import { parameters } from "../src/aws/parameters";
import MockDate from "mockdate";
import { mockUUID } from "../integrationtest/shared/sharedMock";

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
      if (paramName.includes("FrontendPrivateKey")) {
        return (
          "-----BEGIN RSA PRIVATE KEY-----\n" +
          "MIIEpQIBAAKCAQEA6v5JuDdJiKI3rgXF16aURXx467a2vOi7jwHE2tU2CAIAlva2\n" +
          "umLNCmKmPRxzi8LoNwZdRH5WThsxcyt/VJWEiXQQZRgVaDNKjtieWUjhtao6WXYw\n" +
          "bAxrsvGTiksYRDhHHiHlvLEZKZrkFVxfeuUsXkztwsWpAHrJkX2hH7MlDOJknkCL\n" +
          "TgjpjZcpeulBhQKfImNEnOMLa5YlDuBYCofLXyVKU8o6wzVjCVqDzQw6Xal7C5/T\n" +
          "PgM+vkl7szPU86YlY+NDPvYXe2Hgv5A9HlUw5XU/p2+v47+64g3cl1V7xaQ6n4JC\n" +
          "/GQOidUqUdqbLrON8XRqWJ9zbN4MtZH0/jOdqQIDAQABAoIBAQDb2AofzZl9ukVd\n" +
          "CQmONsmAOHLoEofjM9hEceM41z81PqpOkYFh3gz1KlVb1sJCfpXA5LNc4NTdPZOF\n" +
          "q6vz9e2IqoysB1v/n/ygpwd9gDGpQxhTmb6zVutq/ZaKSrbpG71s80l6vjRMOBwp\n" +
          "38Fzt/NKRa4qCcGSMU1iT6XtgiunYFqTT1siyl0fE10/L79Jur0AqnNxfYB4zY+2\n" +
          "YK94bcZdIR9JEE86RE5lc45skfYBk7FzuMn1o1Z6mU4bubGpK0d3z3xoWz5j9GAu\n" +
          "rADPrB1GJS0mm3VRdKZWN52GdmtX1lXXS0OGRUokGZtkyxBSaQAofdN7uHJpMv/F\n" +
          "0ZbIHjgBAoGBAP2UBfMoDU+bVC6CyCKUzr4PGszx1rMaQRvn3/qHkkDxGhOtE6Fy\n" +
          "Gxd/EgVXQv8wGgvK8tTqkG2XlWBVGk7UO9AB2YmyaPwzv9EAJsxuVTrQNzCV7buk\n" +
          "S6M3yRfQT2siyE52EoB//DgJT98UXYKgcLHLv6FRsUKkTYHgmQEokzG9AoGBAO08\n" +
          "04T3VFHj5XevY+7dhZ8XIG8AFo7fK1A3omluhy66CaAHP9msaVtmMyqvXv/F1k2N\n" +
          "MUdZ8KDtDQ5RxlyOuge93fMJPuphm+XqHeKK73kUbjZNEAAV288zw3vVXteodriq\n" +
          "GZoP4EmAo34E8aaYcYvoQNO+MiPQ9aYeYuu133xdAoGBALWNZ30ibfVTFsB+LmBj\n" +
          "/mmhUuTtOXTeFUOvjnNG4XXRqYPw5R8wHSmDdxmP0o32mI9c7ON4VZPBddeU1tMd\n" +
          "rP1OdbvamsQHIQy4eQ7g5/DF5t3IWn+AMA9Z/4YnRNVF//f9HV4XRDOypxbm89R0\n" +
          "nnsNj9QmMy2tiTi135YuwMRZAoGBANKJhaneGT2ng3CI/aXxf/ElBAqeSGa41WaW\n" +
          "SRNKHLwyK/KSHG8gHEwZ0dTS1/sjZsFiSVZqEiuu1ERd/C0OGThfnsZd8TDuOP18\n" +
          "nNL8u/N3VyvnjgiVXYJwDM8sF8RJ5DqT8q6P4ls4x19CIfbYGQSxtD5172drvWWU\n" +
          "V/OZb2GdAoGAMxAD+gDRK2v1JqUrQhCasglWVhumYKNfYtAsl4ifSIsI4cQqa554\n" +
          "G2xyz91BEf6u3+72fulLAXJnaX+yJthDCCY4dE4uPRjdd6HQU0rAMHCOd506RkmO\n" +
          "mPYHAj2MPodJgqSeM38QpmNhHZNK6sRGVf65alkjQZAM5kb/Ptpa0nc=\n" +
          "-----END RSA PRIVATE KEY-----\n"
        );
      }
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
