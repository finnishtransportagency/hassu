import { describe, it } from "mocha";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";
import sinon from "sinon";
import { parameters } from "../../../src/aws/parameters";
import GetProjektiStatus from "../../../src/projekti/status/getProjektiStatus";
import MockDate from "mockdate";
import { kategorisoimattomatId } from "hassu-common/aineistoKategoriat";

describe("getProjektiStatus", () => {
  before(() => {
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
  });

  after(() => {
    sinon.restore();
  });

  afterEach(() => {
    MockDate.reset();
  });

  const baseProjekti = {
    oid: "123",
    velho: {
      suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
      nimi: "Nimi",
      asiatunnusVayla: "123",
    },
    kielitiedot: {
      ensisijainenKieli: API.Kieli.SUOMI,
    },
    vahainenMenettely: false,
    euRahoitus: false,
    versio: 1,
    asianhallinta: { inaktiivinen: true },
    kayttoOikeudet: [
      {
        puhelinnumero: "0291234567",
        kayttajatunnus: "A111000",
        tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
        email: "email@email.com",
        organisaatio: "",
        etunimi: "Etunimi",
        sukunimi: "Sukunimi",
      },
    ],
  };

  it("returns SUUNNITTELU if aloituskuulutus has been published and vahainenMenettely = false", async () => {
    const projekti = {
      ...baseProjekti,
      vahainenMenettely: false,
      aloitusKuulutus: {
        id: 1,
        muokkausTila: API.MuokkausTila.LUKU,
      },
      aloitusKuulutusJulkaisut: [
        {
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        },
      ],
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.SUUNNITTELU);
  });

  it("returns SUUNNITTELU if aloituskuulutus is migrated and vahainenMenettely = false", async () => {
    const projekti = {
      ...baseProjekti,
      vahainenMenettely: false,
      aloitusKuulutus: {
        id: 1,
        muokkausTila: API.MuokkausTila.MIGROITU,
      },
      aloitusKuulutusJulkaisut: [
        {
          tila: API.KuulutusJulkaisuTila.MIGROITU,
        },
      ],
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.SUUNNITTELU);
  });

  it("returns NAHTAVILLAOLO_AINEISTOT if aloituskuulutus is migrated and vahainenMenettely = true", async () => {
    const projekti = {
      ...baseProjekti,
      vahainenMenettely: true,
      aloitusKuulutus: {
        id: 1,
        muokkausTila: API.MuokkausTila.MIGROITU,
      },
      aloitusKuulutusJulkaisut: [
        {
          tila: API.KuulutusJulkaisuTila.MIGROITU,
        },
      ],
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.NAHTAVILLAOLO_AINEISTOT);
  });

  it("returns NAHTAVILLAOLO_AINEISTOT if aloituskuulutus has been published and vahainenMenettely = true", async () => {
    const projekti = {
      ...baseProjekti,
      vahainenMenettely: true,
      aloitusKuulutus: {
        id: 1,
        muokkausTila: API.MuokkausTila.LUKU,
      },
      aloitusKuulutusJulkaisut: [
        {
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        },
      ],
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.NAHTAVILLAOLO_AINEISTOT);
  });

  it("returns NAHTAVILLAOLO nähtävilläolo has aineistot ok", async () => {
    const projekti = {
      ...baseProjekti,
      nahtavillaoloVaihe: {
        id: 1,
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            nimi: "Nimi",
            uuid: "1",
            tila: API.AineistoTila.ODOTTAA_TUONTIA,
            kategoriaId: "osa-a",
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.NAHTAVILLAOLO);
  });

  it("returns HYVAKSYMISMENETTELYSSA_AINEISTOT if nähtävilläolo is published and its kuulutusVaihePaattyyPaiva has passed but hyväksymisvaihe aineistot is not ok", async () => {
    MockDate.set("2000-01-02");
    const projekti = {
      ...baseProjekti,
      nahtavillaoloVaiheJulkaisut: [
        {
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
          kuulutusVaihePaattyyPaiva: "2000-01-01",
        },
      ],
      hyvaksymisPaatosVaihe: {
        id: 1,
        hyvaksymisPaatos: [
          {
            dokumenttiOid: "2",
            nimi: "Nimi2",
            uuid: "2",
            tila: API.AineistoTila.VALMIS,
          },
        ],
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            nimi: "Nimi",
            uuid: "1",
            tila: API.AineistoTila.VALMIS,
            kategoriaId: kategorisoimattomatId,
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.HYVAKSYMISMENETTELYSSA_AINEISTOT);
  });

  it("returns HYVAKSYMISMENETTELYSSA_AINEISTOT if nähtävilläolo is migrated but hyväksymisvaihe aineistot is not ok", async () => {
    MockDate.set("2000-01-02");
    const projekti = {
      ...baseProjekti,
      nahtavillaoloVaiheJulkaisut: [
        {
          tila: API.KuulutusJulkaisuTila.MIGROITU,
        },
      ],
      hyvaksymisPaatosVaihe: {
        id: 1,
        hyvaksymisPaatos: [
          {
            dokumenttiOid: "2",
            nimi: "Nimi2",
            uuid: "2",
            tila: API.AineistoTila.VALMIS,
          },
        ],
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            nimi: "Nimi",
            uuid: "1",
            tila: API.AineistoTila.VALMIS,
            kategoriaId: kategorisoimattomatId,
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.HYVAKSYMISMENETTELYSSA_AINEISTOT);
  });

  it("returns HYVAKSYMISMENETTELYSSA if nähtävilläolo is published and its kuulutusVaihePaattyyPaiva has passed and hyväksymisvaihe aineistot is ok", async () => {
    MockDate.set("2000-01-02");
    const projekti = {
      ...baseProjekti,
      nahtavillaoloVaiheJulkaisut: [
        {
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
          kuulutusVaihePaattyyPaiva: "2000-01-01",
        },
      ],
      hyvaksymisPaatosVaihe: {
        id: 1,
        hyvaksymisPaatos: [
          {
            dokumenttiOid: "2",
            nimi: "Nimi2",
            uuid: "2",
            tila: API.AineistoTila.VALMIS,
          },
        ],
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            nimi: "Nimi",
            uuid: "1",
            tila: API.AineistoTila.ODOTTAA_TUONTIA,
            kategoriaId: "osa-a",
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.HYVAKSYMISMENETTELYSSA);
  });

  it("returns HYVAKSYMISMENETTELYSSA if nähtävilläolo is migrated and hyväksymisvaihe aineistot is ok", async () => {
    MockDate.set("2000-01-02");
    const projekti = {
      ...baseProjekti,
      nahtavillaoloVaiheJulkaisut: [
        {
          tila: API.KuulutusJulkaisuTila.MIGROITU,
        },
      ],
      hyvaksymisPaatosVaihe: {
        id: 1,
        hyvaksymisPaatos: [
          {
            dokumenttiOid: "2",
            nimi: "Nimi2",
            uuid: "2",
            tila: API.AineistoTila.VALMIS,
          },
        ],
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            nimi: "Nimi",
            uuid: "1",
            tila: API.AineistoTila.ODOTTAA_TUONTIA,
            kategoriaId: "osa-a",
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.HYVAKSYMISMENETTELYSSA);
  });

  it("returns HYVAKSYTTY if käsittelyn tila has hyväksymispäätös info, nähtävilläolo is published and its kuulutusVaihePaattyyPaiva has passed and hyväksymisvaihe aineistot is ok", async () => {
    MockDate.set("2000-01-02");
    const projekti = {
      ...baseProjekti,
      kasittelynTila: {
        hyvaksymispaatos: {
          paatoksenPvm: "2000-01-01",
          asianumero: "asianumero",
        },
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
          kuulutusVaihePaattyyPaiva: "2000-01-01",
        },
      ],
      hyvaksymisPaatosVaihe: {
        id: 1,
        hyvaksymisPaatos: [
          {
            dokumenttiOid: "2",
            nimi: "Nimi2",
            uuid: "2",
            tila: API.AineistoTila.VALMIS,
          },
        ],
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            nimi: "Nimi",
            uuid: "1",
            tila: API.AineistoTila.ODOTTAA_TUONTIA,
            kategoriaId: "osa-a",
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.HYVAKSYTTY);
  });
});
