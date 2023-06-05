import { describe, it } from "mocha";
import { openSearchClientJulkinen, openSearchClientYllapito } from "../../src/projektiSearch/openSearchClient";
import { projektiSearchService } from "../../src/projektiSearch/projektiSearchService";
import * as sinon from "sinon";
import { Kieli, ListaaProjektitInput, ProjektiTyyppi, Status, SuunnittelustaVastaavaViranomainen } from "../../../common/graphql/apiModel";
import { kuntametadata } from "../../../common/kuntametadata";
import { UserFixture } from "../fixture/userFixture";
import { userService } from "../../src/user";
import { expect } from "chai";

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
          nimi: "Maantie 370 Ravikylän jkpp-tie ja liittymien parantaminen",
          projektiTyyppi: "TIE",
          suunnittelustaVastaavaViranomainen: "KAAKKOIS_SUOMEN_ELY",
          asiatunnus: "TESTI.123",
          vaihe: "EI_JULKAISTU",
          vaylamuoto: ["tie"],
          projektipaallikko: "Pertti Paallikko",
          aktiivinen: true,
          paivitetty: "2023-02-15T09:48:37+02:00",
          muokkaajat: [UserFixture.hassuATunnus1.uid, UserFixture.manuMuokkaaja.uid],
          saame: false,
        },
      },
      {
        _index: "projekti",
        _type: "_doc",
        _id: "2",
        _score: 1.0,
        _source: {
          nimi: "Maantie 249 parantaminen välillä Kaukolantien liittymä – Pehtoorinpolun liittymä, tie- ja rakennussuunnitelma, Sastamala",
          projektiTyyppi: "TIE",
          suunnittelustaVastaavaViranomainen: "PIRKANMAAN_ELY",
          asiatunnus: "PIRELY/8634/2019",
          maakunnat: [6],
          vaihe: "SUUNNITTELU",
          vaylamuoto: ["tie"],
          projektipaallikko: "Pekka Paallikko",
          aktiivinen: true,
          paivitetty: "2023-04-19T16:40:36+03:00",
          muokkaajat: [UserFixture.hassuATunnus1.uid],
          viimeisinJulkaisu: "2023-02-17",
          saame: false,
        },
      },
    ],
  },
};

const fakeSearchResponse2 = {
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
};

const listaaProjektitInput: ListaaProjektitInput = {
  projektiTyyppi: ProjektiTyyppi.TIE,
  nimi: " foo   bar ",
  vaylamuoto: ["tie"],
  maakunta: kuntametadata.idsForMaakuntaNames(["Pirkanmaa"]),
  suunnittelustaVastaavaViranomainen: [SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO, SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY],
  vaihe: [Status.EI_JULKAISTU, Status.SUUNNITTELU],
};

describe("ProjektiSearchService", () => {
  let openSearchQueryStub: sinon.SinonStub;
  let openSearchSuomiQueryStub: sinon.SinonStub;

  before(() => {
    openSearchQueryStub = sinon.stub(openSearchClientYllapito, "query");
    openSearchSuomiQueryStub = sinon.stub(openSearchClientJulkinen["SUOMI"], "query");
  });

  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    sinon.restore();
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
    await expect(projektiSearchService.searchByOid(["1"])).to.eventually.be.fulfilled;
  });

  it("should handle successful result", async () => {
    openSearchQueryStub.returns(fakeSearchResponse);
    expect(await projektiSearchService.searchByOid(["1", "2"])).toMatchSnapshot();
  });

  it("should handle query parameters successfully", async () => {
    openSearchQueryStub.onFirstCall().returns(fakeSearchResponse);
    openSearchQueryStub.onSecondCall().returns(fakeSearchResponse2);

    await projektiSearchService.searchYllapito(listaaProjektitInput);
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

  describe("should contain (unindexed) information about whether the user can modify the project", () => {
    const userFixture = new UserFixture(userService);

    afterEach(() => {
      userFixture.logout();
    });

    beforeEach(() => {
      openSearchQueryStub.onFirstCall().returns(fakeSearchResponse);
      openSearchQueryStub.onSecondCall().returns(fakeSearchResponse2);
    });

    it("hassuATunnus1 should be able to edit both projects", async () => {
      userFixture.loginAs(UserFixture.hassuATunnus1);

      const response = await projektiSearchService.searchYllapito(listaaProjektitInput);

      const tulos1 = response.tulokset?.[0];
      const tulos2 = response.tulokset?.[1];
      expect(tulos1?.oikeusMuokata).to.be.true;
      expect(tulos2?.oikeusMuokata).to.be.true;
    });

    it("manuMuokkaaja is able to edit only the second project", async () => {
      userFixture.loginAs(UserFixture.manuMuokkaaja);

      const response = await projektiSearchService.searchYllapito(listaaProjektitInput);

      const tulos1 = response.tulokset?.[0];
      const tulos2 = response.tulokset?.[1];
      expect(tulos1?.oikeusMuokata).to.be.true;
      expect(tulos2?.oikeusMuokata).to.be.false;
    });

    it("ADMIN should be able to edit the projects", async () => {
      userFixture.loginAsAdmin();

      const response = await projektiSearchService.searchYllapito(listaaProjektitInput);

      const tulos1 = response.tulokset?.[0];
      const tulos2 = response.tulokset?.[1];
      expect(tulos1?.oikeusMuokata).to.be.true;
      expect(tulos2?.oikeusMuokata).to.be.true;
    });
  });
});
