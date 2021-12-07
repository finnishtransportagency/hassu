import { describe, it } from "mocha";
import { openSearchClient } from "../../src/projektiSearch/openSearchClient";
import { projektiSearchService } from "../../src/projektiSearch/projektiSearchService";
import * as sinon from "sinon";

const sandbox = require("sinon").createSandbox();

const { expect } = require("chai");

describe("ProjektiSearchService", () => {
  let openSearchQueryStub: sinon.SinonStub;
  before(() => {
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

  it("should handle successful result", async () => {
    openSearchQueryStub.returns({
      took: 8,
      timed_out: false,
      _shards: { total: 5, successful: 5, skipped: 0, failed: 0 },
      hits: {
        total: { value: 2, relation: "eq" },
        max_score: 1.0,
        hits: [
          {
            _index: "projekti",
            _type: "_doc",
            _id: "1",
            _score: 1.0,
            _source: {
              muistiinpano: "testi",
              tyyppi: "TIE",
              velho: {
                tilaajaOrganisaatio: "Etelä-Pohjanmaan ELY-keskus",
                nimi: "Nimi1",
                vaylamuoto: ["tie"],
              },
              status: "EI_JULKAISTU",
            },
          },
          {
            _index: "projekti",
            _type: "_doc",
            _id: "2",
            _score: 1.0,
            _source: {
              muistiinpano: "",
              tyyppi: "TIE",
              velho: {
                tilaajaOrganisaatio: "Uudenmaan ELY-keskus",
                nimi: "Nimi2",
                vaylamuoto: ["tie"],
              },
              status: "EI_JULKAISTU",
            },
          },
        ],
      },
    });
    expect(await projektiSearchService.search({ oid: ["1", "2"] })).toMatchSnapshot();
  });
});
