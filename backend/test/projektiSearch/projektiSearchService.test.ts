import { describe, it } from "mocha";
import { openSearchClient } from "../../src/projektiSearch/openSearchClient";
import { projektiSearchService } from "../../src/projektiSearch/projektiSearchService";
import * as sinon from "sinon";

const sandbox = require("sinon").createSandbox();

// const { expect } = require("chai");

describe("ProjektiSearchService", () => {
  let openSearchQueryStub: sinon.SinonStub;
  beforeEach(() => {
    openSearchQueryStub = sinon.stub(openSearchClient, "query");
  });
  afterEach(() => {
    sandbox.reset();
  });
  after(() => {
    sandbox.restore();
  });

  it("should handle query errors", async () => {
    openSearchQueryStub.returns({
      error: {
        root_cause: [
          {
            type: "index_not_found_exception",
            reason: "no such index [projekti]",
            index: "projekti",
            "resource.id": "projekti",
            "resource.type": "index_or_alias",
            index_uuid: "_na_",
          },
        ],
        type: "index_not_found_exception",
        reason: "no such index [projekti]",
        index: "projekti",
        "resource.id": "projekti",
        "resource.type": "index_or_alias",
        index_uuid: "_na_",
      },
      status: 404,
    });
    await projektiSearchService.search({ oid: ["1"] });
  });
});
