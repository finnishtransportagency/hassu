import { describe, it } from "mocha";
import { OpenSearchClient, openSearchClient } from "../../src/projektiSearch/openSearchClient";
import * as sinon from "sinon";
import { ProjektiSearchMaintenanceService } from "../../src/projektiSearch/projektiSearchMaintenanceService";

const sandbox = sinon.createSandbox();

const { expect } = require("chai");

describe("ProjektiSearchMaintenanceService", () => {
  let stub: sinon.SinonStubbedInstance<OpenSearchClient>;
  before(() => {
    stub = sandbox.stub(openSearchClient);
  });
  afterEach(() => {
    sandbox.reset();
  });
  after(() => {
    sandbox.restore();
  });

  it("should delete and create index", async () => {
    await new ProjektiSearchMaintenanceService().deleteIndex();
    [stub.put, stub.delete, stub.putSettings, stub.putMapping].forEach((stub) =>
      expect({
        [stub.name]: stub.getCalls().map((call) => ({
          args: call.args.slice(0, call.args.length - 1),
        })),
      }).toMatchSnapshot()
    );
  });
});
