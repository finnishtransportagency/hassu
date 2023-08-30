import { describe, it } from "mocha";
import * as API from "../../../common/graphql/apiModel";
import { adaptMuokkausTila, GenericKuulutus } from "../../src/projekti/projektiUtil";

const { expect } = require("chai");

describe("adaptMuokkausTila", () => {
  it("should return LUKU if there is one HYVAKSYTTY julkaisu and uudelleenKuulutus and aineistoMuokkaus are null", async () => {
    const kuulutus: GenericKuulutus = {
      id: 1,
      uudelleenKuulutus: null,
      aineistoMuokkaus: null,
    };
    const kuulutusJulkaisut: GenericKuulutus[] = [
      {
        id: 1,
        uudelleenKuulutus: null,
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
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
    const kuulutusJulkaisut: GenericKuulutus[] = [
      {
        id: 1,
        uudelleenKuulutus: null,
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
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
    const kuulutusJulkaisut: GenericKuulutus[] = [
      {
        id: 1,
        uudelleenKuulutus: null,
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
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
      },
    ];

    const result = await adaptMuokkausTila(kuulutus, kuulutusJulkaisut);
    expect(result).to.be.eql(API.MuokkausTila.AINEISTO_MUOKKAUS);
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
    const kuulutusJulkaisut: GenericKuulutus[] = [
      {
        id: 1,
        uudelleenKuulutus: null,
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.MIGROITU,
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
    const kuulutusJulkaisut: GenericKuulutus[] = [
      {
        id: 1,
        uudelleenKuulutus: null,
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.MIGROITU,
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
    const kuulutusJulkaisut: GenericKuulutus[] = [
      {
        id: 1,
        uudelleenKuulutus: null,
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.MIGROITU,
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
    const kuulutusJulkaisut: GenericKuulutus[] = [
      {
        id: 1,
        uudelleenKuulutus: null,
        aineistoMuokkaus: null,
        tila: API.KuulutusJulkaisuTila.MIGROITU,
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
      },
    ];

    const result = await adaptMuokkausTila(kuulutus, kuulutusJulkaisut);
    expect(result).to.be.eql(API.MuokkausTila.AINEISTO_MUOKKAUS);
  });
});
