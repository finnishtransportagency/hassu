import { describe, it } from "mocha";
import * as API from "../../../common/graphql/apiModel";
import { adaptMuokkausTila, GenericDbKuulutusJulkaisu, GenericKuulutus } from "../../src/projekti/projektiUtil";
import MockDate from "mockdate";
import { expect } from "chai";

describe("adaptMuokkausTila", () => {
  it("should return LUKU if there is one HYVAKSYTTY julkaisu and uudelleenKuulutus and aineistoMuokkaus are null", async () => {
    const kuulutus: GenericKuulutus = {
      id: 1,
      uudelleenKuulutus: null,
      aineistoMuokkaus: null,
    };
    const kuulutusJulkaisut: GenericDbKuulutusJulkaisu[] = [
      {
        id: 1,
        uudelleenKuulutus: null,
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
      },
    ];

    const result = await adaptMuokkausTila(kuulutus, kuulutusJulkaisut);
    expect(result).to.be.eql(API.MuokkausTila.LUKU);
  });

  it("should return AINEISTO_MUOKKAUS if there is one HYVAKSYTTY julkaisu and uudelleenKuulutus is null and aineistoMuokkaus is truthy", async () => {
    const kuulutus: GenericKuulutus = {
      id: 1,
      uudelleenKuulutus: null,
      aineistoMuokkaus: {
        alkuperainenHyvaksymisPaiva: "2022-01-01",
      },
    };
    const kuulutusJulkaisut: GenericDbKuulutusJulkaisu[] = [
      {
        id: 1,
        uudelleenKuulutus: null,
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
      },
    ];

    const result = await adaptMuokkausTila(kuulutus, kuulutusJulkaisut);
    expect(result).to.be.eql(API.MuokkausTila.AINEISTO_MUOKKAUS);
  });

  it("should return AINEISTO_MUOKKAUS if there is one HYVAKSYTTY julkaisu and uudelleenKuulutus is truthy and aineistoMuokkaus is truthy", async () => {
    const kuulutus: GenericKuulutus = {
      id: 2,
      uudelleenKuulutus: {
        alkuperainenHyvaksymisPaiva: "2022-01-01",
        tila: API.UudelleenkuulutusTila.PERUUTETTU,
        selosteKuulutukselle: {
          SUOMI: "seloste",
        },
        selosteLahetekirjeeseen: {
          SUOMI: "seloste",
        },
      },
      aineistoMuokkaus: {
        alkuperainenHyvaksymisPaiva: "2022-01-01",
      },
    };
    const kuulutusJulkaisut: GenericDbKuulutusJulkaisu[] = [
      {
        id: 1,
        uudelleenKuulutus: null,
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
      },
      {
        id: 2,
        uudelleenKuulutus: {
          alkuperainenHyvaksymisPaiva: "2022-01-01",
          tila: API.UudelleenkuulutusTila.PERUUTETTU,
          selosteKuulutukselle: {
            SUOMI: "seloste",
          },
          selosteLahetekirjeeseen: {
            SUOMI: "seloste",
          },
        },
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
      },
    ];

    const result = await adaptMuokkausTila(kuulutus, kuulutusJulkaisut);
    expect(result).to.be.eql(API.MuokkausTila.AINEISTO_MUOKKAUS);
  });

  it("should return LUKU if it would otherwise be AINEISTO_MUOKKAUS, but kuulutusPaiva has already passed", async () => {
    const kuulutus: GenericKuulutus = {
      id: 2,
      uudelleenKuulutus: {
        alkuperainenHyvaksymisPaiva: "2022-01-01",
        tila: API.UudelleenkuulutusTila.PERUUTETTU,
        selosteKuulutukselle: {
          SUOMI: "seloste",
        },
        selosteLahetekirjeeseen: {
          SUOMI: "seloste",
        },
      },
      aineistoMuokkaus: {
        alkuperainenHyvaksymisPaiva: "2022-01-01",
      },
    };
    const kuulutusJulkaisut: GenericDbKuulutusJulkaisu[] = [
      {
        id: 1,
        uudelleenKuulutus: null,
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
      },
      {
        id: 2,
        kuulutusPaiva: "2022-01-02",
        uudelleenKuulutus: {
          alkuperainenHyvaksymisPaiva: "2022-01-01",
          tila: API.UudelleenkuulutusTila.PERUUTETTU,
          selosteKuulutukselle: {
            SUOMI: "seloste",
          },
          selosteLahetekirjeeseen: {
            SUOMI: "seloste",
          },
        },
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
      },
    ];
    MockDate.set("2022-01-02");
    const result = await adaptMuokkausTila(kuulutus, kuulutusJulkaisut);
    expect(result).to.be.eql(API.MuokkausTila.LUKU);
    MockDate.reset();
  });

  it("should return MUOKKAUS if there is one MIGROITU julkaisu and uudelleenKuulutus is truthy and aineistoMuokkaus is null", async () => {
    const kuulutus: GenericKuulutus = {
      id: 2,
      uudelleenKuulutus: {
        alkuperainenHyvaksymisPaiva: "2022-01-01",
        tila: API.UudelleenkuulutusTila.PERUUTETTU,
        selosteKuulutukselle: {
          SUOMI: "seloste",
        },
        selosteLahetekirjeeseen: {
          SUOMI: "seloste",
        },
      },
      aineistoMuokkaus: null,
    };
    const kuulutusJulkaisut: GenericDbKuulutusJulkaisu[] = [
      {
        id: 1,
        uudelleenKuulutus: null,
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.MIGROITU,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
      },
    ];

    const result = await adaptMuokkausTila(kuulutus, kuulutusJulkaisut);
    expect(result).to.be.eql(API.MuokkausTila.MUOKKAUS);
  });

  it("should return LUKU if there is one MIGROITU julkaisu and one ODOTTAA_HYVAKSYNTAA julkaisu", async () => {
    const kuulutus: GenericKuulutus = {
      id: 2,
      uudelleenKuulutus: {
        alkuperainenHyvaksymisPaiva: "2022-01-01",
        tila: API.UudelleenkuulutusTila.PERUUTETTU,
        selosteKuulutukselle: {
          SUOMI: "seloste",
        },
        selosteLahetekirjeeseen: {
          SUOMI: "seloste",
        },
      },
      aineistoMuokkaus: null,
    };
    const kuulutusJulkaisut: GenericDbKuulutusJulkaisu[] = [
      {
        id: 1,
        uudelleenKuulutus: null,
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.MIGROITU,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
      },
      {
        id: 2,
        uudelleenKuulutus: {
          alkuperainenHyvaksymisPaiva: "2022-01-01",
          tila: API.UudelleenkuulutusTila.PERUUTETTU,
          selosteKuulutukselle: {
            SUOMI: "seloste",
          },
          selosteLahetekirjeeseen: {
            SUOMI: "seloste",
          },
        },
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
      },
    ];

    const result = await adaptMuokkausTila(kuulutus, kuulutusJulkaisut);
    expect(result).to.be.eql(API.MuokkausTila.LUKU);
  });

  it("should return LUKU if there is one MIGROITU julkaisu and one HYVAKSYTTY julkaisu", async () => {
    const kuulutus: GenericKuulutus = {
      id: 2,
      uudelleenKuulutus: null,
      aineistoMuokkaus: null,
    };
    const kuulutusJulkaisut: GenericDbKuulutusJulkaisu[] = [
      {
        id: 1,
        uudelleenKuulutus: null,
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.MIGROITU,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
      },
      {
        id: 2,
        uudelleenKuulutus: {
          alkuperainenHyvaksymisPaiva: "2022-01-01",
          tila: API.UudelleenkuulutusTila.PERUUTETTU,
          selosteKuulutukselle: {
            SUOMI: "seloste",
          },
          selosteLahetekirjeeseen: {
            SUOMI: "seloste",
          },
        },
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
      },
    ];

    const result = await adaptMuokkausTila(kuulutus, kuulutusJulkaisut);
    expect(result).to.be.eql(API.MuokkausTila.LUKU);
  });

  it("should return AINEISTO_MUOKKAUS if there is one MIGROITU julkaisu and one HYVAKSYTTY julkaisu and aineistoMuokkaus and uudelleenKuulutus are truthy", async () => {
    const kuulutus: GenericKuulutus = {
      id: 2,
      uudelleenKuulutus: {
        alkuperainenHyvaksymisPaiva: "2022-01-01",
        tila: API.UudelleenkuulutusTila.PERUUTETTU,
        selosteKuulutukselle: {
          SUOMI: "seloste",
        },
        selosteLahetekirjeeseen: {
          SUOMI: "seloste",
        },
      },
      aineistoMuokkaus: {
        alkuperainenHyvaksymisPaiva: "2022-01-01",
      },
    };
    const kuulutusJulkaisut: GenericDbKuulutusJulkaisu[] = [
      {
        id: 1,
        uudelleenKuulutus: null,
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.MIGROITU,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
      },
      {
        id: 2,
        uudelleenKuulutus: {
          alkuperainenHyvaksymisPaiva: "2022-01-01",
          tila: API.UudelleenkuulutusTila.PERUUTETTU,
          selosteKuulutukselle: {
            SUOMI: "seloste",
          },
          selosteLahetekirjeeseen: {
            SUOMI: "seloste",
          },
        },
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
      },
    ];

    const result = await adaptMuokkausTila(kuulutus, kuulutusJulkaisut);
    expect(result).to.be.eql(API.MuokkausTila.AINEISTO_MUOKKAUS);
  });
});
