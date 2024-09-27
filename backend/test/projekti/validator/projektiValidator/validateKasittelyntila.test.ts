import { describe, it } from "mocha";
import { UserFixture } from "../../../fixture/userFixture";
import { userService } from "../../../../src/user";
import { validateKasittelynTila } from "../../../../src/projekti/validator/validateKasittelyntila";
import { Projekti, Status, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../../../../src/database/model";
import { expect } from "chai";

function createDBProjekti(asianumero?: string, paatoksenPvm?: string | null, aktiivinen?: boolean) {
  const dbProjekti: DBProjekti = {
    oid: "1",
    versio: 1,
    kayttoOikeudet: [
      {
        email: "",
        etunimi: "",
        kayttajatunnus: "",
        organisaatio: "",
        sukunimi: "",
      },
    ],
    kasittelynTila: {
      hyvaksymispaatos: {
        aktiivinen,
        asianumero,
        paatoksenPvm,
      },
    },
  };
  return dbProjekti;
}

function createDBProjekti2() {
  const dbProjekti: DBProjekti = {
    ...createDBProjekti(),
    kasittelynTila: {},
  };
  return dbProjekti;
}

function createDBProjekti3() {
  const dbProjekti: DBProjekti = {
    ...createDBProjekti(),
    kasittelynTila: { hyvaksymispaatos: {} },
  };
  return dbProjekti;
}

function createDBProjekti4() {
  const dbProjekti: DBProjekti = {
    ...createDBProjekti(),
    kasittelynTila: undefined,
  };
  return dbProjekti;
}

function createProjekti(status: Status) {
  const projekti: Projekti = {
    __typename: "Projekti",
    oid: "1",
    versio: 1,
    velho: { __typename: "Velho" },
    asianhallinta: { __typename: "Asianhallinta", aktivoitavissa: false, inaktiivinen: true },
    status,
  };
  return projekti;
}

describe("validateKasittelyntila", () => {
  const userFixture = new UserFixture(userService);

  beforeEach(() => {
    userFixture.loginAsAdmin();
  });

  afterEach(() => {
    userFixture.logout();
  });

  it("Testaa hyväksymispäätös tyhjällä db kasittelynTila", async () => {
    const input: TallennaProjektiInput = {
      oid: "1",
      versio: 1,
      kasittelynTila: {
        hyvaksymispaatos: {},
      },
    };
    const dbProjekti = createDBProjekti2();
    const projekti = createProjekti(Status.ALOITUSKUULUTUS);
    validateKasittelynTila(dbProjekti, projekti, input);
  });

  it("Testaa hyväksymispäätös tyhjällä db kasittelynTila hyväksymispäätös", async () => {
    const input: TallennaProjektiInput = {
      oid: "1",
      versio: 1,
      kasittelynTila: {
        hyvaksymispaatos: {},
      },
    };
    const dbProjekti = createDBProjekti3();
    const projekti = createProjekti(Status.ALOITUSKUULUTUS);
    validateKasittelynTila(dbProjekti, projekti, input);
  });

  it("Testaa hyväksymispäätös tyhjällä db kasittelynTila jossa db attribuutit tyhjiä", async () => {
    const input: TallennaProjektiInput = {
      oid: "1",
      versio: 1,
      kasittelynTila: {
        hyvaksymispaatos: {},
      },
    };
    const dbProjekti = createDBProjekti();
    const projekti = createProjekti(Status.ALOITUSKUULUTUS);
    validateKasittelynTila(dbProjekti, projekti, input);
  });

  it("Testaa hyväksymispäätös tyhjällä db kasittelynTila jossa input attribuutit tyhjiä", async () => {
    const input: TallennaProjektiInput = {
      oid: "1",
      versio: 1,
      kasittelynTila: {
        hyvaksymispaatos: { asianumero: "", paatoksenPvm: null },
      },
    };
    const dbProjekti = createDBProjekti2();
    const projekti = createProjekti(Status.ALOITUSKUULUTUS);
    validateKasittelynTila(dbProjekti, projekti, input);
  });

  it("Testaa hyväksymispäätös tyhjällä db kasittelynTila jossa input attribuutit tyhjiä2", async () => {
    const input: TallennaProjektiInput = {
      oid: "1",
      versio: 1,
      kasittelynTila: {
        hyvaksymispaatos: { asianumero: "", paatoksenPvm: null },
      },
    };
    const dbProjekti = createDBProjekti3();
    const projekti = createProjekti(Status.ALOITUSKUULUTUS);
    validateKasittelynTila(dbProjekti, projekti, input);
  });

  it("Testaa hyväksymispäätös tyhjällä db kasittelynTila jossa input attribuutit tyhjiä3", async () => {
    const input: TallennaProjektiInput = {
      oid: "1",
      versio: 1,
      kasittelynTila: {
        hyvaksymispaatos: { asianumero: "", paatoksenPvm: null },
      },
    };
    const dbProjekti = createDBProjekti4();
    const projekti = createProjekti(Status.ALOITUSKUULUTUS);
    validateKasittelynTila(dbProjekti, projekti, input);
  });

  it("Testaa hyväksymispäätös tyhjällä db kasittelynTila jossa input attribuutit tyhjiä aktiivinen tila mukana true", async () => {
    const input: TallennaProjektiInput = {
      oid: "1",
      versio: 1,
      kasittelynTila: {
        hyvaksymispaatos: { asianumero: "", paatoksenPvm: null },
      },
    };
    const dbProjekti = createDBProjekti("", null, true);
    const projekti = createProjekti(Status.ALOITUSKUULUTUS);
    validateKasittelynTila(dbProjekti, projekti, input);
  });

  it("Testaa hyväksymispäätös tyhjällä db kasittelynTila jossa input attribuutit tyhjiä aktiivinen tila mukana false", async () => {
    const input: TallennaProjektiInput = {
      oid: "1",
      versio: 1,
      kasittelynTila: {
        hyvaksymispaatos: { asianumero: "", paatoksenPvm: null },
      },
    };
    const dbProjekti = createDBProjekti("", null, false);
    const projekti = createProjekti(Status.ALOITUSKUULUTUS);
    validateKasittelynTila(dbProjekti, projekti, input);
  });

  it("Testaa hyväksymispäätös kasittelynTila samoilla db ja input arvoilla", async () => {
    const input: TallennaProjektiInput = {
      oid: "1",
      versio: 1,
      kasittelynTila: {
        hyvaksymispaatos: { asianumero: "test123", paatoksenPvm: "2023-11-15" },
      },
    };
    const dbProjekti = createDBProjekti("test123", "2023-11-15", false);
    const projekti = createProjekti(Status.ALOITUSKUULUTUS);
    validateKasittelynTila(dbProjekti, projekti, input);
  });

  it("Testaa hyväksymispäätös tyhjällä db kasittelynTila jossa input asianumero annettu", async () => {
    const input: TallennaProjektiInput = {
      oid: "1",
      versio: 1,
      kasittelynTila: {
        hyvaksymispaatos: { asianumero: "test123", paatoksenPvm: null },
      },
    };
    const dbProjekti = createDBProjekti("", null, false);
    const projekti = createProjekti(Status.ALOITUSKUULUTUS);
    expect(() => validateKasittelynTila(dbProjekti, projekti, input)).to.throw(
      "Hyväksymispäätöstä voidaan muokata vasta nähtävilläolovaiheessa tai sitä myöhemmin. Projektin status nyt:ALOITUSKUULUTUS"
    );
  });

  it("Testaa hyväksymispäätös tyhjällä db kasittelynTila jossa input paatoksenPvm annettu", async () => {
    userFixture.loginAsAdmin();
    const input: TallennaProjektiInput = {
      oid: "1",
      versio: 1,
      kasittelynTila: {
        hyvaksymispaatos: { asianumero: "", paatoksenPvm: "2023-11-11" },
      },
    };
    const dbProjekti = createDBProjekti("", null, true);
    const projekti = createProjekti(Status.ALOITUSKUULUTUS);
    expect(() => validateKasittelynTila(dbProjekti, projekti, input)).to.throw(
      "Hyväksymispäätöstä voidaan muokata vasta nähtävilläolovaiheessa tai sitä myöhemmin. Projektin status nyt:ALOITUSKUULUTUS"
    );
  });

  it("Testaa hyväksymispäätös tyhjällä db kasittelynTila jossa input paatoksenPvm annettu nähtävilläolossa", async () => {
    userFixture.loginAsAdmin();
    const input: TallennaProjektiInput = {
      oid: "1",
      versio: 1,
      kasittelynTila: {
        hyvaksymispaatos: { asianumero: "test123", paatoksenPvm: "2023-11-11" },
      },
    };
    const dbProjekti = createDBProjekti("", null, true);
    const projekti = createProjekti(Status.NAHTAVILLAOLO);
    validateKasittelynTila(dbProjekti, projekti, input);
  });
});
