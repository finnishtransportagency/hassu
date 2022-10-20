import { describe, it } from "mocha";
import { openSearchClientJulkinen, openSearchClientYllapito } from "../../src/projektiSearch/openSearchClient";
import { projektiSearchService } from "../../src/projektiSearch/projektiSearchService";
import * as sinon from "sinon";
import { Kieli, ProjektiTyyppi, Status, Viranomainen } from "../../../common/graphql/apiModel";
import { kuntametadata } from "../../../common/kuntametadata";

const sandbox = require("sinon").createSandbox();

const { expect } = require("chai");

const fakeSearchResponse = {
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
};
describe("ProjektiSearchService", () => {
  let openSearchQueryStub: sinon.SinonStub;
  let openSearchSuomiQueryStub: sinon.SinonStub;
  beforeEach(() => {
    openSearchQueryStub = sandbox.stub(openSearchClientYllapito, "query");
    openSearchSuomiQueryStub = sandbox.stub(openSearchClientJulkinen["SUOMI"], "query");
  });
  afterEach(() => {
    sandbox.reset();
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
    await projektiSearchService.searchByOid(["1"]);
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
    expect(await projektiSearchService.searchByOid(["1", "2"])).toMatchSnapshot();
  });

  it("should handle query parameters successfully", async () => {
    openSearchQueryStub.onFirstCall().returns(fakeSearchResponse);
    openSearchQueryStub.onSecondCall().returns({
      aggregations: {
        aktiivinen: {
          buckets: [
            {
              key: 0,
              doc_count: 0,
              projektiTyyppi: {
                buckets: [],
              },
            },
            {
              key: 1,
              doc_count: 1,
              projektiTyyppi: {
                buckets: [
                  {
                    key: ProjektiTyyppi.TIE,
                    doc_count: 1,
                  },
                ],
              },
            },
          ],
        },
      },
    });

    await projektiSearchService.searchYllapito({
      projektiTyyppi: ProjektiTyyppi.TIE,
      nimi: "foo",
      vaylamuoto: ["tie"],
      maakunta: kuntametadata.idsForMaakuntaNames(["Pirkanmaa"]),
      suunnittelustaVastaavaViranomainen: [Viranomainen.VAYLAVIRASTO, Viranomainen.UUDENMAAN_ELY],
      vaihe: [Status.EI_JULKAISTU, Status.SUUNNITTELU],
    });
    expect(openSearchQueryStub.getCalls()[0].args[0]).toMatchSnapshot();
    expect(openSearchQueryStub.getCalls()[1].args[0]).toMatchSnapshot();
  });

  it("should handle query parameters successfully for public search", async () => {
    openSearchSuomiQueryStub.returns(fakeSearchResponse);

    await projektiSearchService.searchJulkinen({
      kieli: Kieli.SUOMI,
    });
    expect(openSearchSuomiQueryStub.getCalls()[0].args[0]).toMatchSnapshot();
  });
});
