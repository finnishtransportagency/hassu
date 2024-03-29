import { describe, it } from "mocha";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { projektiAdapter } from "../../src/projekti/adapter/projektiAdapter";
import { IllegalArgumentError } from "hassu-common/error";
import * as sinon from "sinon";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import {
  Kieli,
  LokalisoituLinkkiInput,
  LokalisoituTekstiInput,
  VuorovaikutusKierrosInput,
  VuorovaikutusTilaisuusInput,
} from "hassu-common/graphql/apiModel";
import { apiTestFixture } from "../../integrationtest/api/apiTestFixture";
import cloneDeep from "lodash/cloneDeep";
import { expect } from "chai";

describe("projektiAdapter", () => {
  let fixture: ProjektiFixture;

  let getKayttajasStub: sinon.SinonStub;

  before(() => {
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
  });

  beforeEach(() => {
    fixture = new ProjektiFixture();
    const personSearchFixture = new PersonSearchFixture();
    getKayttajasStub.resolves(
      Kayttajas.fromKayttajaList([
        personSearchFixture.pekkaProjari,
        personSearchFixture.mattiMeikalainen,
        personSearchFixture.manuMuokkaaja,
      ])
    );
  });

  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  it("should prevent saving vuorovaikutusKierros if suunnittelunEteneminenJaKesto is only in ensisijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = fixture.dbProjektiHyvaksymisMenettelyssa()
      .vuorovaikutusKierros as VuorovaikutusKierrosInput;
    const suunnittelunEteneminenJaKesto: LokalisoituTekstiInput =
      vuorovaikutusKierrosInput.suunnittelunEteneminenJaKesto as LokalisoituTekstiInput;
    delete suunnittelunEteneminenJaKesto.RUOTSI;
    vuorovaikutusKierrosInput.suunnittelunEteneminenJaKesto = suunnittelunEteneminenJaKesto;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if suunnittelunEteneminenJaKesto is only in toissijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();
    // switch suomi and ruotsi, because suomi is always required
    projekti.kielitiedot = {
      ensisijainenKieli: projekti.kielitiedot?.toissijainenKieli as Kieli,
      toissijainenKieli: projekti.kielitiedot?.ensisijainenKieli,
    };
    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = fixture.dbProjektiHyvaksymisMenettelyssa()
      .vuorovaikutusKierros as VuorovaikutusKierrosInput;
    const suunnittelunEteneminenJaKesto: LokalisoituTekstiInput =
      vuorovaikutusKierrosInput.suunnittelunEteneminenJaKesto as LokalisoituTekstiInput;
    delete suunnittelunEteneminenJaKesto.RUOTSI;
    vuorovaikutusKierrosInput.suunnittelunEteneminenJaKesto = suunnittelunEteneminenJaKesto;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should NOT prevent saving vuorovaikutusKierros if suunnittelunEteneminenJaKesto is missing", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = fixture.dbProjektiHyvaksymisMenettelyssa()
      .vuorovaikutusKierros as VuorovaikutusKierrosInput;
    delete vuorovaikutusKierrosInput.suunnittelunEteneminenJaKesto;

    // Validate that there is no error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.not.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if arvioSeuraavanVaiheenAlkamisesta is only in ensisijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = fixture.dbProjektiHyvaksymisMenettelyssa()
      .vuorovaikutusKierros as VuorovaikutusKierrosInput;
    const arvioSeuraavanVaiheenAlkamisesta: LokalisoituTekstiInput =
      vuorovaikutusKierrosInput.arvioSeuraavanVaiheenAlkamisesta as LokalisoituTekstiInput;
    delete arvioSeuraavanVaiheenAlkamisesta.RUOTSI;
    vuorovaikutusKierrosInput.arvioSeuraavanVaiheenAlkamisesta = arvioSeuraavanVaiheenAlkamisesta;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if arvioSeuraavanVaiheenAlkamisesta is only in toissijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();
    // switch suomi and ruotsi, because suomi is always required
    projekti.kielitiedot = {
      ensisijainenKieli: projekti.kielitiedot?.toissijainenKieli as Kieli,
      toissijainenKieli: projekti.kielitiedot?.ensisijainenKieli,
    };
    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = fixture.dbProjektiHyvaksymisMenettelyssa()
      .vuorovaikutusKierros as VuorovaikutusKierrosInput;
    const arvioSeuraavanVaiheenAlkamisesta: LokalisoituTekstiInput =
      vuorovaikutusKierrosInput.arvioSeuraavanVaiheenAlkamisesta as LokalisoituTekstiInput;
    delete arvioSeuraavanVaiheenAlkamisesta.RUOTSI;
    vuorovaikutusKierrosInput.arvioSeuraavanVaiheenAlkamisesta = arvioSeuraavanVaiheenAlkamisesta;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should NOT prevent saving vuorovaikutusKierros if arvioSeuraavanVaiheenAlkamisesta is only in ensisijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = fixture.dbProjektiHyvaksymisMenettelyssa()
      .vuorovaikutusKierros as VuorovaikutusKierrosInput;
    delete vuorovaikutusKierrosInput.arvioSeuraavanVaiheenAlkamisesta;

    // Validate that there is no error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.not.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if suunnittelumateriaali is only in ensisijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = fixture.dbProjektiHyvaksymisMenettelyssa()
      .vuorovaikutusKierros as VuorovaikutusKierrosInput;
    const suunnittelumateriaali: LokalisoituLinkkiInput[] = [
      {
        SUOMI: {
          nimi: "SUOMI linkki",
          url: "http://www.url.fi",
        },
      },
    ];
    vuorovaikutusKierrosInput.suunnittelumateriaali = suunnittelumateriaali;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if suunnittelumateriaali is only in toissijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();
    // switch suomi and ruotsi, because suomi is always required
    projekti.kielitiedot = {
      ensisijainenKieli: projekti.kielitiedot?.toissijainenKieli as Kieli,
      toissijainenKieli: projekti.kielitiedot?.ensisijainenKieli,
    };
    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = fixture.dbProjektiHyvaksymisMenettelyssa()
      .vuorovaikutusKierros as VuorovaikutusKierrosInput;
    const suunnittelumateriaali: LokalisoituLinkkiInput[] = [
      {
        SUOMI: {
          nimi: "SUOMI linkki",
          url: "http://www.url.fi",
        },
      },
    ];
    vuorovaikutusKierrosInput.suunnittelumateriaali = suunnittelumateriaali;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should NOT prevent saving vuorovaikutusKierros if suunnittelumateriaali is only in ensisijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = fixture.dbProjektiHyvaksymisMenettelyssa()
      .vuorovaikutusKierros as VuorovaikutusKierrosInput;
    delete vuorovaikutusKierrosInput.suunnittelumateriaali;

    // Validate that there is no error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.not.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if first of videos is only in ensisijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = fixture.dbProjektiHyvaksymisMenettelyssa()
      .vuorovaikutusKierros as VuorovaikutusKierrosInput;
    const videot: LokalisoituLinkkiInput[] = [
      {
        SUOMI: {
          nimi: "SUOMI linkki",
          url: "http://www.url.fi",
        },
      },
    ];
    vuorovaikutusKierrosInput.videot = videot;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if first of videos is only in toissijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();
    // switch suomi and ruotsi, because suomi is always required
    projekti.kielitiedot = {
      ensisijainenKieli: projekti.kielitiedot?.toissijainenKieli as Kieli,
      toissijainenKieli: projekti.kielitiedot?.ensisijainenKieli,
    };
    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = fixture.dbProjektiHyvaksymisMenettelyssa()
      .vuorovaikutusKierros as VuorovaikutusKierrosInput;
    const videot: LokalisoituLinkkiInput[] = [
      {
        SUOMI: {
          nimi: "SUOMI linkki",
          url: "http://www.url.fi",
        },
      },
    ];
    vuorovaikutusKierrosInput.videot = videot;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should NOT prevent saving vuorovaikutusKierros if videos are in neither language", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = fixture.dbProjektiHyvaksymisMenettelyssa()
      .vuorovaikutusKierros as VuorovaikutusKierrosInput;
    vuorovaikutusKierrosInput.videot = [];

    // Validate that there is no error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.not.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if second of videos is only in ensisijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = fixture.dbProjektiHyvaksymisMenettelyssa()
      .vuorovaikutusKierros as VuorovaikutusKierrosInput;
    const videot: LokalisoituLinkkiInput[] = [
      {
        SUOMI: {
          nimi: "SUOMI linkki",
          url: "http://www.url.fi",
        },
        RUOTSI: {
          nimi: "RUOTSI linkki",
          url: "http://www.url.sv",
        },
      },
      {
        SUOMI: {
          nimi: "SUOMI linkki2",
          url: "http://www.url2.fi",
        },
      },
    ];
    vuorovaikutusKierrosInput.videot = videot;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if second of videos is only in toissijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();
    // switch suomi and ruotsi, because suomi is always required
    projekti.kielitiedot = {
      ensisijainenKieli: projekti.kielitiedot?.toissijainenKieli as Kieli,
      toissijainenKieli: projekti.kielitiedot?.ensisijainenKieli,
    };
    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = fixture.dbProjektiHyvaksymisMenettelyssa()
      .vuorovaikutusKierros as VuorovaikutusKierrosInput;
    const videot: LokalisoituLinkkiInput[] = [
      {
        SUOMI: {
          nimi: "SUOMI linkki",
          url: "http://www.url.fi",
        },
        RUOTSI: {
          nimi: "RUOTSI linkki",
          url: "http://www.url.sv",
        },
      },
      {
        SUOMI: {
          nimi: "SUOMI linkki2",
          url: "http://www.url2.fi",
        },
      },
    ];
    vuorovaikutusKierrosInput.videot = videot;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if PAIKALLA type of vuorovaikutustilaisuus is missing nimi only in ensisijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = { ...apiTestFixture.vuorovaikutusKierrosSuomiRuotsi(0, ["A123"]) };
    const vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] = (
      vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[]
    ).map((tilaisuus, index) => {
      if (index === 1) {
        return { ...tilaisuus, nimi: { SUOMI: tilaisuus.nimi?.SUOMI as string } };
      }
      return tilaisuus;
    });
    vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet = vuorovaikutusTilaisuudet;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if PAIKALLA type of vuorovaikutustilaisuus is missing nimi only in toissijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();
    // switch suomi and ruotsi, because suomi is always required
    projekti.kielitiedot = {
      ensisijainenKieli: projekti.kielitiedot?.toissijainenKieli as Kieli,
      toissijainenKieli: projekti.kielitiedot?.ensisijainenKieli,
    };
    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = { ...apiTestFixture.vuorovaikutusKierrosSuomiRuotsi(0, ["A123"]) };
    const vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] = (
      vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[]
    ).map((tilaisuus, index) => {
      if (index === 1) {
        return { ...tilaisuus, nimi: { SUOMI: tilaisuus.nimi?.SUOMI as string } };
      }
      return tilaisuus;
    });
    vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet = vuorovaikutusTilaisuudet;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should NOT prevent saving vuorovaikutusKierros if PAIKALLA type of vuorovaikutustilaisuus is missing name altogether", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = { ...apiTestFixture.vuorovaikutusKierrosSuomiRuotsi(0, ["A123"]) };
    const vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] = (
      vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[]
    ).map((tilaisuus, index) => {
      if (index === 1) {
        return { ...tilaisuus, name: null };
      }
      return tilaisuus;
    });
    vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet = vuorovaikutusTilaisuudet;

    // Validate that there is no error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.not.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if PAIKALLA type of vuorovaikutustilaisuus is missing osoite only in ensisijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = { ...apiTestFixture.vuorovaikutusKierrosSuomiRuotsi(0, ["A123"]) };
    const vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] = (
      vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[]
    ).map((tilaisuus, index) => {
      if (index === 1) {
        return { ...tilaisuus, osoite: { SUOMI: tilaisuus.osoite?.SUOMI as string } };
      }
      return tilaisuus;
    });
    vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet = vuorovaikutusTilaisuudet;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if PAIKALLA type of vuorovaikutustilaisuus is missing osoite only in toissijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();
    // switch suomi and ruotsi, because suomi is always required
    projekti.kielitiedot = {
      ensisijainenKieli: projekti.kielitiedot?.toissijainenKieli as Kieli,
      toissijainenKieli: projekti.kielitiedot?.ensisijainenKieli,
    };
    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = { ...apiTestFixture.vuorovaikutusKierrosSuomiRuotsi(0, ["A123"]) };
    const vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] = (
      vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[]
    ).map((tilaisuus, index) => {
      if (index === 1) {
        return { ...tilaisuus, osoite: { SUOMI: tilaisuus.osoite?.SUOMI as string } };
      }
      return tilaisuus;
    });
    vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet = vuorovaikutusTilaisuudet;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if PAIKALLA type of vuorovaikutustilaisuus is missing paikka only in ensisijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = { ...apiTestFixture.vuorovaikutusKierrosSuomiRuotsi(0, ["A123"]) };
    const vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] = (
      vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[]
    ).map((tilaisuus, index) => {
      if (index === 1) {
        return { ...tilaisuus, paikka: { SUOMI: tilaisuus.paikka?.SUOMI as string } };
      }
      return tilaisuus;
    });
    vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet = vuorovaikutusTilaisuudet;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if PAIKALLA type of vuorovaikutustilaisuus is missing paikka only in toissijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();
    // switch suomi and ruotsi, because suomi is always required
    projekti.kielitiedot = {
      ensisijainenKieli: projekti.kielitiedot?.toissijainenKieli as Kieli,
      toissijainenKieli: projekti.kielitiedot?.ensisijainenKieli,
    };
    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = { ...apiTestFixture.vuorovaikutusKierrosSuomiRuotsi(0, ["A123"]) };
    const vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] = (
      vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[]
    ).map((tilaisuus, index) => {
      if (index === 1) {
        return { ...tilaisuus, paikka: { SUOMI: tilaisuus.paikka?.SUOMI as string } };
      }
      return tilaisuus;
    });
    vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet = vuorovaikutusTilaisuudet;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should NOT prevent saving vuorovaikutusKierros if PAIKALLA type of vuorovaikutustilaisuus is missing paikka altogether", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = { ...apiTestFixture.vuorovaikutusKierrosSuomiRuotsi(0, ["A123"]) };
    const vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] = (
      vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[]
    ).map((tilaisuus, index) => {
      if (index === 1) {
        return { ...tilaisuus, paikka: null };
      }
      return tilaisuus;
    });
    vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet = vuorovaikutusTilaisuudet;

    // Validate that there is no error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.not.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if PAIKALLA type of vuorovaikutustilaisuus is missing postitoimipaikka only in ensisijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = { ...apiTestFixture.vuorovaikutusKierrosSuomiRuotsi(0, ["A123"]) };
    const vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] = (
      vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[]
    ).map((tilaisuus, index) => {
      if (index === 1) {
        return { ...tilaisuus, postitoimipaikka: { SUOMI: tilaisuus.postitoimipaikka?.SUOMI as string } };
      }
      return tilaisuus;
    });
    vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet = vuorovaikutusTilaisuudet;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if PAIKALLA type of vuorovaikutustilaisuus is missing postitoimipaikka only in toissijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();
    // switch suomi and ruotsi, because suomi is always required
    projekti.kielitiedot = {
      ensisijainenKieli: projekti.kielitiedot?.toissijainenKieli as Kieli,
      toissijainenKieli: projekti.kielitiedot?.ensisijainenKieli,
    };
    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = { ...apiTestFixture.vuorovaikutusKierrosSuomiRuotsi(0, ["A123"]) };
    const vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] = (
      vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[]
    ).map((tilaisuus, index) => {
      if (index === 1) {
        return { ...tilaisuus, postitoimipaikka: { SUOMI: tilaisuus.postitoimipaikka?.SUOMI as string } };
      }
      return tilaisuus;
    });
    vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet = vuorovaikutusTilaisuudet;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should NOT prevent saving vuorovaikutusKierros if PAIKALLA type of vuorovaikutustilaisuus is missing postitoimipaikka altogether", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = { ...apiTestFixture.vuorovaikutusKierrosSuomiRuotsi(0, ["A123"]) };
    const vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] = (
      vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[]
    ).map((tilaisuus, index) => {
      if (index === 1) {
        return { ...tilaisuus, postitoimipaikka: null };
      }
      return tilaisuus;
    });
    vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet = vuorovaikutusTilaisuudet;

    // Validate that there is no error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.not.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if PAIKALLA type of vuorovaikutustilaisuus is missing lisatiedot only in ensisijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = { ...apiTestFixture.vuorovaikutusKierrosSuomiRuotsi(0, ["A123"]) };
    const vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] = (
      vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[]
    ).map((tilaisuus, index) => {
      if (index === 1) {
        return { ...tilaisuus, lisatiedot: { SUOMI: tilaisuus.lisatiedot?.SUOMI as string } };
      }
      return tilaisuus;
    });
    vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet = vuorovaikutusTilaisuudet;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent saving vuorovaikutusKierros if PAIKALLA type of vuorovaikutustilaisuus is missing lisatiedot only in toissijainenKieli", async () => {
    const projekti = fixture.dbProjekti1();
    // switch suomi and ruotsi, because suomi is always required
    projekti.kielitiedot = {
      ensisijainenKieli: projekti.kielitiedot?.toissijainenKieli as Kieli,
      toissijainenKieli: projekti.kielitiedot?.ensisijainenKieli,
    };
    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = { ...apiTestFixture.vuorovaikutusKierrosSuomiRuotsi(0, ["A123"]) };
    const vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] = (
      vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[]
    ).map((tilaisuus, index) => {
      if (index === 1) {
        return { ...tilaisuus, lisatiedot: { SUOMI: tilaisuus.lisatiedot?.SUOMI as string } };
      }
      return tilaisuus;
    });
    vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet = vuorovaikutusTilaisuudet;

    // Validate that there is an error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.rejectedWith(IllegalArgumentError);
  });

  it("should NOT prevent saving vuorovaikutusKierros if PAIKALLA type of vuorovaikutustilaisuus is missing lisatiedot altogether", async () => {
    const projekti = fixture.dbProjekti1();

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = { ...apiTestFixture.vuorovaikutusKierrosSuomiRuotsi(0, ["A123"]) };
    const vuorovaikutusTilaisuudet: VuorovaikutusTilaisuusInput[] = (
      vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet as VuorovaikutusTilaisuusInput[]
    ).map((tilaisuus, index) => {
      if (index === 1) {
        return { ...tilaisuus, lisatiedot: null };
      }
      return tilaisuus;
    });
    vuorovaikutusKierrosInput.vuorovaikutusTilaisuudet = vuorovaikutusTilaisuudet;

    // Validate that there is no error
    return expect(
      projektiAdapter.adaptProjektiToSave(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        vuorovaikutusKierros: vuorovaikutusKierrosInput,
      })
    ).to.be.fulfilled;
  });

  it("should be able to make esitettavatYhteystiedot list empty", async () => {
    const projekti = cloneDeep(fixture.dbProjekti2_9);
    expect(projekti.vuorovaikutusKierros?.esitettavatYhteystiedot?.yhteysTiedot?.length).to.equal(1);

    const vuorovaikutusKierrosInput: VuorovaikutusKierrosInput = apiTestFixture.vuorovaikutusKierrosSuomiRuotsi(0, ["A123"]);
    if (vuorovaikutusKierrosInput.esitettavatYhteystiedot) {
      vuorovaikutusKierrosInput.esitettavatYhteystiedot.yhteysTiedot = [];
    }

    const adaptResult = await projektiAdapter.adaptProjektiToSave(projekti, {
      oid: projekti.oid,
      versio: projekti.versio,
      vuorovaikutusKierros: vuorovaikutusKierrosInput,
    });

    // Validate that there is no yhteystiedot
    expect(adaptResult.projekti.vuorovaikutusKierros?.esitettavatYhteystiedot?.yhteysTiedot?.length).to.equal(0);
  });
});
