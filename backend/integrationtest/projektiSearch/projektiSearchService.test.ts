/* tslint:disable:no-unused-expression */
import { describe, it } from "mocha";
import { ProjektiFixture } from "../../test/fixture/projektiFixture";
import { projektiSearchService } from "../../src/projektiSearch/projektiSearchService";
import { ListaaProjektitInput, ProjektiTyyppi, Status, Viranomainen } from "../../../common/graphql/apiModel";
import cloneDeep from "lodash/cloneDeep";
import { DBProjekti } from "../../src/database/model/projekti";
import dayjs from "dayjs";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import * as sinon from "sinon";

const { expect } = require("chai");

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

type ProjektiVariation = {
  oid: string;
  suunnittelustaVastaavaViranomainen: Viranomainen;
  maakunnat: string[];
} & Omit<ListaaProjektitInput, "vaihe" | "suunnittelustaVastaavaViranomainen">;

const testData: ProjektiVariation[] = [
  {
    oid: "1",
    projektiTyyppi: ProjektiTyyppi.TIE,
    vaylamuoto: ["tie"],
    maakunnat: ["Pohjanmaa"],
    asiatunnus: "A1",
    suunnittelustaVastaavaViranomainen: Viranomainen.POHJOIS_POHJANMAAN_ELY,
  },
  {
    oid: "2",
    projektiTyyppi: ProjektiTyyppi.TIE,
    vaylamuoto: ["tie"],
    maakunnat: ["Uusimaa", "Pirkanmaa"],
    asiatunnus: "A2",
    suunnittelustaVastaavaViranomainen: Viranomainen.UUDENMAAN_ELY,
  },
  {
    oid: "3",
    projektiTyyppi: ProjektiTyyppi.RATA,
    vaylamuoto: ["rata"],
    maakunnat: ["Ahvenanmaa"],
    asiatunnus: "A3",
    suunnittelustaVastaavaViranomainen: Viranomainen.VAYLAVIRASTO,
  },
  {
    oid: "4",
    projektiTyyppi: ProjektiTyyppi.RATA,
    vaylamuoto: ["tie", "rata"],
    maakunnat: ["Uusimaa", "Ahvenanmaa"],
    asiatunnus: "A4",
    suunnittelustaVastaavaViranomainen: Viranomainen.UUDENMAAN_ELY,
  },
  {
    oid: "5",
    projektiTyyppi: ProjektiTyyppi.YLEINEN,
    vaylamuoto: ["tie"],
    maakunnat: ["Pirkanmaa"],
    asiatunnus: "A5",
    suunnittelustaVastaavaViranomainen: Viranomainen.PIRKANMAAN_ELY,
  },
  {
    oid: "6",
    projektiTyyppi: ProjektiTyyppi.YLEINEN,
    vaylamuoto: ["tie", "rata"],
    maakunnat: ["Kanta-Häme"],
    asiatunnus: "A6",
    suunnittelustaVastaavaViranomainen: Viranomainen.KESKI_SUOMEN_ELY,
  },
];

describe.skip("ProjektiSearchService", () => {
  const projektiFixture = new ProjektiFixture();
  let userFixture: UserFixture;

  before(async () => {
    for (let i = 0; i < testData.length; i++) {
      const data = testData[i];
      const projekti: DBProjekti = cloneDeep(projektiFixture.dbProjekti1);
      projekti.oid = data.oid;
      projekti.velho.tyyppi = data.projektiTyyppi;
      projekti.velho.vaylamuoto = data.vaylamuoto;
      projekti.velho.nimi = "unittest" + data.oid;
      projekti.velho.maakunnat = data.maakunnat;
      projekti.velho.asiatunnusELY = data.asiatunnus;
      projekti.suunnittelustaVastaavaViranomainen = data.suunnittelustaVastaavaViranomainen;
      projekti.paivitetty = dayjs("2020-01-01T23:00:00+02:00").add(-i, "hours").format();
      await projektiSearchService.indexProjekti(projekti);
    }
    await delay(500);
  });

  after(async () => {
    for (const data of testData) {
      await projektiSearchService.removeProjekti(data.oid);
    }
  });

  beforeEach(() => {
    userFixture = new UserFixture(userService);
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
        nimi: "unittest3",
        projektiTyyppi: ProjektiTyyppi.RATA,
      })
    ).tulokset;
    expect(results).to.have.length(1);
    expect(results[0].oid).to.eq("3");
  });

  it("should search by vaihe successfully", async () => {
    const results = (
      await projektiSearchService.searchYllapito({
        vaihe: [Status.EI_JULKAISTU],
      })
    ).tulokset;
    for (const result of results) {
      expect(result.vaihe).to.eq(Status.EI_JULKAISTU, JSON.stringify(result));
    }
  });

  it("should search by suunnittelustaVastaavaViranomainen successfully", async () => {
    const results = (
      await projektiSearchService.searchYllapito({
        suunnittelustaVastaavaViranomainen: [Viranomainen.KESKI_SUOMEN_ELY, Viranomainen.UUDENMAAN_ELY],
      })
    ).tulokset;
    for (const result of results) {
      expect(result.suunnittelustaVastaavaViranomainen).to.be.oneOf([
        Viranomainen.KESKI_SUOMEN_ELY,
        Viranomainen.UUDENMAAN_ELY,
      ]);
    }
  });

  it("should search by vaihe and name successfully", async () => {
    const results = (
      await projektiSearchService.searchYllapito({
        nimi: "unittest3",
        projektiTyyppi: ProjektiTyyppi.RATA,
        vaihe: [Status.EI_JULKAISTU],
      })
    ).tulokset;
    expect(results).to.have.length(1);
    expect(results[0].oid).to.eq("3");
  });

  it("should not include results if name and vaihe don't match at the same time", async () => {
    const results = (
      await projektiSearchService.searchYllapito({
        nimi: "unittest3",
        projektiTyyppi: ProjektiTyyppi.RATA,
        vaihe: [Status.NAHTAVILLAOLO],
      })
    ).tulokset;
    expect(results).to.have.length(0);
  });

  it("should search by asiatunnus", async () => {
    const results = (
      await projektiSearchService.searchYllapito({
        asiatunnus: "A3",
        projektiTyyppi: ProjektiTyyppi.RATA,
      })
    ).tulokset;
    expect(results).to.have.length(1);
    expect(results[0].oid).to.eq("3");
  });

  it("should search by vaylamuoto", async () => {
    const results = (
      await projektiSearchService.searchYllapito({
        vaylamuoto: ["tie"],
      })
    ).tulokset;
    for (const result of results) {
      expect(result.vaylamuoto).to.contain.oneOf(["tie"]);
    }
  });

  it("should search by maakunta", async () => {
    const results = (
      await projektiSearchService.searchYllapito({
        maakunta: ["Uusimaa", "Pirkanmaa"],
      })
    ).tulokset;
    for (const result of results) {
      expect(result.maakunnat).to.contain.oneOf(["Uusimaa", "Pirkanmaa"]);
    }
  });

  it("should search by modification permissions", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const results = (
      await projektiSearchService.searchYllapito({
        vainProjektitMuokkausOikeuksin: true,
      })
    ).tulokset;
    expect(results.map((value) => value.oid)).to.contain.members(["1", "2"]);

    userFixture.loginAs(UserFixture.manuMuokkaaja);
    const results2 = (
      await projektiSearchService.searchYllapito({
        vainProjektitMuokkausOikeuksin: true,
      })
    ).tulokset;
    expect(results2).to.have.length(0);
  });
});
