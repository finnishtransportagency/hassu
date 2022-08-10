/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { LaskuriTyyppi } from "../../../common/graphql/apiModel";
import { calculateEndDate } from "../../src/endDateCalculator/endDateCalculatorHandler";
import { BankHolidays } from "../../src/endDateCalculator/bankHolidays";
import { parseDate } from "../../src/util/dateUtil";
import * as sinon from "sinon";
import { SinonStub } from "sinon";
import { s3Cache } from "../../src/cache/s3Cache";

const { expect } = require("chai");

const sandbox = sinon.createSandbox();

describe("Api", () => {
  let mockS3CacheGet: SinonStub;

  afterEach(() => {
    sandbox.reset();
  });

  before(() => {
    mockS3CacheGet = sandbox.stub(s3Cache, "get");
  });

  beforeEach(() => {
    mockS3CacheGet.returns(["2022-12-24", "2022-12-25", "2022-12-26"]);
  });

  after(() => {
    sandbox.restore();
  });

  it("should calculate correct end date over holidays", async () => {
    expect(
      await calculateEndDate({ alkupaiva: "2022-11-24", tyyppi: LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA })
    ).to.be.equal("2022-12-27");
  });

  it("should calculate correct end date over holidays in dev and test environments with time 00:00", async () => {
    expect(
      await calculateEndDate({ alkupaiva: "2022-11-24T00:00", tyyppi: LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA })
    ).to.be.equal("2022-12-27T00:00");
  });

  it("should calculate correct end date over holidays in dev and test environments with time 12:34", async () => {
    expect(
      await calculateEndDate({ alkupaiva: "2022-11-24T12:34", tyyppi: LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA })
    ).to.be.equal("2022-12-27T12:34");
  });

  it("should calculate correct end date over weekend", async () => {
    expect(
      await calculateEndDate({ alkupaiva: "2022-11-03", tyyppi: LaskuriTyyppi.KUULUTUKSEN_PAATTYMISPAIVA })
    ).to.be.equal("2022-12-05");
  });

  it("should calculate correct Hyväksymispäätöksen kuulutusaika end date over weekend", async () => {
    expect(
      await calculateEndDate({ alkupaiva: "2022-11-03", tyyppi: LaskuriTyyppi.HYVAKSYMISPAATOKSEN_KUULUTUSAIKA })
    ).to.be.equal("2022-12-12");
  });

  it("should manage list of bank holidays correctly", () => {
    const bankHolidays = new BankHolidays(["2022-12-24", "2022-12-25"]);
    expect(bankHolidays.isBankHoliday(parseDate("2022-12-24"))).to.be.true;
    expect(bankHolidays.isBankHoliday(parseDate("2022-12-23"))).to.be.false;
  });
});
