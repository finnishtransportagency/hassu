import { describe, it } from "mocha";
import { ProjektiFixture } from "../../test/fixture/projektiFixture";
import { projektiSearchService } from "../../src/projektiSearch/projektiSearchService";
import { Kieli, ListaaProjektitInput, ProjektiTyyppi, Status, SuunnittelustaVastaavaViranomainen } from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../../src/database/model";
import dayjs from "dayjs";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import sinon from "sinon";
import assert from "assert";
import { kuntametadata } from "hassu-common/kuntametadata";
import { assertIsDefined } from "../../src/util/assertions";

import { expect } from "chai";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

type ProjektiVariation = {
  oid: string;
  suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen;
  maakunnat: number[];
  kunnat: number[];
} & Omit<ListaaProjektitInput, "vaihe" | "suunnittelustaVastaavaViranomainen">;

const testData: ProjektiVariation[] = [
  {
    oid: "1",
    nimi: "yksi kaksi kolme",
    projektiTyyppi: ProjektiTyyppi.TIE,
    vaylamuoto: ["tie"],
    maakunnat: kuntametadata.idsForMaakuntaNames(["Pohjanmaa"]),
    kunnat: kuntametadata.idsForKuntaNames(["Tampere", "Nokia"]),
    asiatunnus: "A1/2412/FOO",
    suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.POHJOIS_POHJANMAAN_ELY,
  },
  {
    oid: "2",
    projektiTyyppi: ProjektiTyyppi.TIE,
    vaylamuoto: ["tie"],
    maakunnat: kuntametadata.idsForMaakuntaNames(["Uusimaa", "Pirkanmaa"]),
    kunnat: kuntametadata.idsForKuntaNames(["Tampere", "Helsinki"]),
    asiatunnus: "A2",
    suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
  },
  {
    oid: "3",
    projektiTyyppi: ProjektiTyyppi.RATA,
    vaylamuoto: ["rata"],
    maakunnat: kuntametadata.idsForMaakuntaNames(["Ahvenanmaa"]),
    kunnat: kuntametadata.idsForKuntaNames(["Maarianhamina"]),
    asiatunnus: "A3",
    suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
  },
  {
    oid: "4",
    projektiTyyppi: ProjektiTyyppi.RATA,
    vaylamuoto: ["tie", "rata"],
    maakunnat: kuntametadata.idsForMaakuntaNames(["Uusimaa", "Ahvenanmaa"]),
    kunnat: kuntametadata.idsForKuntaNames(["Maarianhamina", "Helsinki"]),
    asiatunnus: "A4",
    suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
  },
  {
    oid: "5",
    projektiTyyppi: ProjektiTyyppi.YLEINEN,
    vaylamuoto: ["tie"],
    maakunnat: kuntametadata.idsForMaakuntaNames(["Pirkanmaa"]),
    kunnat: kuntametadata.idsForKuntaNames(["Tampere"]),
    asiatunnus: "A5",
    suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.PIRKANMAAN_ELY,
  },
  {
    oid: "6",
    projektiTyyppi: ProjektiTyyppi.YLEINEN,
    vaylamuoto: ["tie", "rata"],
    maakunnat: kuntametadata.idsForMaakuntaNames(["Kanta-Häme"]),
    kunnat: kuntametadata.idsForKuntaNames(["Hämeenlinna"]),
    asiatunnus: "A6",
    suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.KESKI_SUOMEN_ELY,
  },
];

describe.skip("ProjektiSearchService", () => {
  const projektiFixture = new ProjektiFixture();
  const userFixture = new UserFixture(userService);

  before(async () => {
    for (let i = 0; i < testData.length; i++) {
      const data = testData[i];
      const projekti: DBProjekti = projektiFixture.dbProjekti2();
      assert(projekti);
      assert(projekti.velho);
      assert(projekti.aloitusKuulutusJulkaisut);
      projekti.oid = data.oid;
      projekti.velho.tyyppi = data.projektiTyyppi;
      projekti.velho.vaylamuoto = data.vaylamuoto;
      projekti.velho.nimi = "unittest" + data.oid + (data.nimi ? " " + data.nimi : "");
      projekti.velho.kunnat = data.kunnat;
      projekti.velho.maakunnat = data.maakunnat;
      projekti.velho.asiatunnusELY = data.asiatunnus;
      projekti.velho.suunnittelustaVastaavaViranomainen = data.suunnittelustaVastaavaViranomainen;
      projekti.paivitetty = dayjs("2020-01-01T23:00:00+02:00").add(-i, "hours").format();
      projekti.aloitusKuulutusJulkaisut[0].kuulutusPaiva = "2000-02-02";
      projekti.aloitusKuulutusJulkaisut[0].siirtyySuunnitteluVaiheeseen = "2222-02-02";
      await projektiSearchService.indexProjekti(projekti);
    }
    await delay(500);
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("should search by list of oids successfully", async () => {
    const dbProjektis = await projektiSearchService.searchByOid(["1", "2"]);
    expect(dbProjektis).toMatchSnapshot();
  });

  it("should search by name successfully", async () => {
    const results = (
      await projektiSearchService.searchYllapito({
        nimi: "yks kol",
        projektiTyyppi: ProjektiTyyppi.TIE,
      })
    ).tulokset;

    expect(results).to.have.length(1);
    expect(results?.map((result) => result.oid)).to.contain("1");
  });

  it("should search by vaihe successfully", async () => {
    const results = (
      await projektiSearchService.searchYllapito({
        vaihe: [Status.SUUNNITTELU],
      })
    ).tulokset;
    assert(results);
    for (const result of results) {
      expect(result.vaihe).to.eq(Status.SUUNNITTELU, JSON.stringify(result));
    }
  });

  it("should search by suunnittelustaVastaavaViranomainen successfully", async () => {
    const results = (
      await projektiSearchService.searchYllapito({
        suunnittelustaVastaavaViranomainen: [
          SuunnittelustaVastaavaViranomainen.KESKI_SUOMEN_ELY,
          SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
        ],
      })
    ).tulokset;
    assert(results);
    for (const result of results) {
      expect(result.suunnittelustaVastaavaViranomainen).to.be.oneOf([
        SuunnittelustaVastaavaViranomainen.KESKI_SUOMEN_ELY,
        SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
      ]);
    }
  });

  it("should search by vaihe and name successfully", async () => {
    const results = (
      await projektiSearchService.searchYllapito({
        nimi: "unittest3",
        projektiTyyppi: ProjektiTyyppi.RATA,
        vaihe: [Status.SUUNNITTELU],
      })
    ).tulokset;
    assert(results);
    expect(results.map((result) => result.oid)).to.contain("3");
  });

  it("should not include results if name and vaihe don't match at the same time", async () => {
    const results = (
      await projektiSearchService.searchYllapito({
        nimi: "unittest3",
        projektiTyyppi: ProjektiTyyppi.RATA,
        vaihe: [Status.EI_JULKAISTU],
      })
    ).tulokset;
    expect(results).to.have.length(0);
  });

  it("should search by asiatunnus", async () => {
    const results = (
      await projektiSearchService.searchYllapito({
        asiatunnus: "241",
        projektiTyyppi: ProjektiTyyppi.TIE,
      })
    ).tulokset;
    assertIsDefined(results);
    expect(results).to.have.length(1);
    expect(results[0].oid).to.eq("1");
  });

  it("should search by vaylamuoto", async () => {
    const results = (
      await projektiSearchService.searchYllapito({
        vaylamuoto: ["tie"],
      })
    ).tulokset;
    assert(results);
    for (const result of results) {
      expect(result.vaylamuoto).to.contain.oneOf(["tie"]);
    }
  });

  const uusimaaPirkanmaa = kuntametadata.idsForMaakuntaNames(["Uusimaa", "Pirkanmaa"]);
  it("should search by maakunta", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const results = (
      await projektiSearchService.searchYllapito({
        maakunta: uusimaaPirkanmaa,
      })
    ).tulokset;
    assert(results);
    for (const result of results) {
      expect(result.maakunnat).to.contain.oneOf(uusimaaPirkanmaa);
    }
  });

  it("should search by modification permissions", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const results = (
      await projektiSearchService.searchYllapito({
        vainProjektitMuokkausOikeuksin: true,
      })
    ).tulokset;
    assert(results);
    expect(results.map((value) => value.oid)).to.contain.members(["1", "2"]);

    userFixture.loginAs(UserFixture.manuMuokkaaja);
    const results2 = (
      await projektiSearchService.searchYllapito({
        vainProjektitMuokkausOikeuksin: true,
      })
    ).tulokset;
    expect(results2).to.have.length(0);
  });

  it("should search by maakunta as kansalainen", async () => {
    const results = (
      await projektiSearchService.searchJulkinen({
        kieli: Kieli.SUOMI,
        maakunta: uusimaaPirkanmaa,
      })
    ).tulokset;
    assert(results);
    for (const result of results) {
      expect(result.maakunnat).to.contain.oneOf(uusimaaPirkanmaa);
    }
  });

  it("should search by kunta as kansalainen", async () => {
    const maarianhamina = kuntametadata.idForKuntaName("Maarianhamina");
    const results = (
      await projektiSearchService.searchJulkinen({
        kieli: Kieli.SUOMI,
        kunta: [maarianhamina],
      })
    ).tulokset;
    assert(results);
    for (const result of results) {
      expect(result.kunnat).to.contain(maarianhamina);
    }
  });

  it("should search by nimi as kansalainen", async () => {
    const results = (
      await projektiSearchService.searchJulkinen({
        kieli: Kieli.SUOMI,
        nimi: "testiprojekti",
        vaihe: [Status.ALOITUSKUULUTUS],
      })
    ).tulokset;
    assert(results);
    for (const result of results) {
      expect(result.nimi?.toLowerCase()).to.contain("testiprojekti");
    }
  });
});
