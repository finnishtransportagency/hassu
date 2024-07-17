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
      tyyppi: API.ProjektiTyyppi.TIE,
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
            kategoriaId: "osa_a",
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.NAHTAVILLAOLO);
  });

  it("returns NAHTAVILLAOLO_AINEISTOT if nahtavillaoloVaihe aineistoNahtavilla kategoria is kategorisoimattomat", async () => {
    const projekti = {
      ...baseProjekti,
      vahainenMenettely: true,
      aloitusKuulutusJulkaisut: [
        {
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            nimi: "Nimi",
            uuid: "1",
            tila: API.AineistoTila.ODOTTAA_TUONTIA,
            kategoriaId: kategorisoimattomatId,
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.NAHTAVILLAOLO_AINEISTOT);
  });

  it("returns NAHTAVILLAOLO_AINEISTOT if nahtavillaoloVaihe aineistoNahtavilla kategoria is not found", async () => {
    const projekti = {
      ...baseProjekti,
      vahainenMenettely: true,
      aloitusKuulutusJulkaisut: [
        {
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            nimi: "Nimi",
            uuid: "1",
            tila: API.AineistoTila.ODOTTAA_TUONTIA,
            kategoriaId: "unknown",
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.NAHTAVILLAOLO_AINEISTOT);
  });

  it("returns NAHTAVILLAOLO_AINEISTOT if nahtavillaoloVaihe aineistoNahtavilla kategoria does not exist for the type projektiTyyppi", async () => {
    const projekti = {
      ...baseProjekti,
      vahainenMenettely: true,
      aloitusKuulutusJulkaisut: [
        {
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            nimi: "Nimi",
            uuid: "1",
            tila: API.AineistoTila.ODOTTAA_TUONTIA,
            kategoriaId: "ys_osa_c_siltasuunnitelmat_ja_muut_taitorakenteet",
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.NAHTAVILLAOLO_AINEISTOT);
  });

  it("returns NAHTAVILLAOLO_AINEISTOT if nahtavillaoloVaihe aineistoNahtavilla kategoria is 'deprecated'", async () => {
    const projekti = {
      ...baseProjekti,
      vahainenMenettely: true,
      aloitusKuulutusJulkaisut: [
        {
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            nimi: "Nimi",
            uuid: "1",
            tila: API.AineistoTila.ODOTTAA_TUONTIA,
            kategoriaId: "ulkopuoliset_rakenteet",
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.NAHTAVILLAOLO_AINEISTOT);
  });

  it(
    "returns HYVAKSYMISMENETTELYSSA_AINEISTOT if nähtävilläolo is published and its kuulutusVaihePaattyyPaiva has passed but " +
      "hyväksymisvaihe aineistot includes uncategorized aineistoNahtavilla",
    async () => {
      MockDate.set("2000-01-02");
      const projekti = {
        ...baseProjekti,
        nahtavillaoloVaiheJulkaisut: [
          {
            tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
            kuulutusVaihePaattyyPaiva: "2000-01-01",
            id: 1,
            kuulutusYhteystiedot: {},
            yhteystiedot: [],
            velho: baseProjekti.velho,
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
    }
  );

  it(
    "returns HYVAKSYMISMENETTELYSSA_AINEISTOT if nähtävilläolo is published and its kuulutusVaihePaattyyPaiva has passed but " +
      "hyväksymisvaihe is missing hyvaksymisPaatos",
    async () => {
      MockDate.set("2000-01-02");
      const projekti = {
        ...baseProjekti,
        nahtavillaoloVaiheJulkaisut: [
          {
            tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
            kuulutusVaihePaattyyPaiva: "2000-01-01",
            id: 1,
            kuulutusYhteystiedot: {},
            yhteystiedot: [],
            velho: baseProjekti.velho,
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
        },
      };
      const status = await GetProjektiStatus.getProjektiStatus(projekti);
      expect(status).to.eql(API.Status.HYVAKSYMISMENETTELYSSA_AINEISTOT);
    }
  );

  it(
    "returns HYVAKSYMISMENETTELYSSA_AINEISTOT if nähtävilläolo is published and its kuulutusVaihePaattyyPaiva has passed but " +
      "hyväksymisvaihe is missing aineistoNahtavilla",
    async () => {
      MockDate.set("2000-01-02");
      const projekti = {
        ...baseProjekti,
        nahtavillaoloVaiheJulkaisut: [
          {
            tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
            kuulutusVaihePaattyyPaiva: "2000-01-01",
            id: 1,
            kuulutusYhteystiedot: {},
            yhteystiedot: [],
            velho: baseProjekti.velho,
          },
        ],
        hyvaksymisPaatosVaihe: {
          id: 1,
          aineistoNahtavilla: [
            {
              dokumenttiOid: "1",
              nimi: "Nimi",
              uuid: "1",
              tila: API.AineistoTila.VALMIS,
              kategoriaId: "osa_a",
            },
          ],
        },
      };
      const status = await GetProjektiStatus.getProjektiStatus(projekti);
      expect(status).to.eql(API.Status.HYVAKSYMISMENETTELYSSA_AINEISTOT);
    }
  );

  it(
    "returns HYVAKSYMISMENETTELYSSA_AINEISTOT if nähtävilläolo is migrated but " +
      "hyväksymisvaihe aineistot includes uncategorized aineistoNahtavilla",
    async () => {
      MockDate.set("2000-01-02");
      const projekti = {
        ...baseProjekti,
        nahtavillaoloVaiheJulkaisut: [
          {
            tila: API.KuulutusJulkaisuTila.MIGROITU,
            id: 1,
            kuulutusYhteystiedot: {},
            yhteystiedot: [],
            velho: baseProjekti.velho,
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
    }
  );

  it("returns HYVAKSYMISMENETTELYSSA if nähtävilläolo is published and its kuulutusVaihePaattyyPaiva has passed and hyväksymisvaihe aineistot is ok", async () => {
    MockDate.set("2000-01-02");
    const projekti = {
      ...baseProjekti,
      nahtavillaoloVaiheJulkaisut: [
        {
          id: 1,
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
          kuulutusVaihePaattyyPaiva: "2000-01-01",
          kielitiedot: { ensisijainenKieli: API.Kieli.SUOMI, toissijainenKieli: undefined, projektinNimiVieraskielella: undefined },
          kuulutusYhteystiedot: {},
          yhteystiedot: [],
          velho: baseProjekti.velho,
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
            kategoriaId: "osa_a",
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
          id: 1,
          kuulutusYhteystiedot: {},
          yhteystiedot: [],
          velho: baseProjekti.velho,
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
            kategoriaId: "osa_a",
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.HYVAKSYMISMENETTELYSSA);
  });

  it(
    "returns HYVAKSYTTY if käsittelyn tila has hyväksymispäätös info, nähtävilläolo is published and " +
      "its kuulutusVaihePaattyyPaiva has passed and hyväksymisvaihe aineistot is ok",
    async () => {
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
            id: 1,
            kuulutusYhteystiedot: {},
            yhteystiedot: [],
            velho: baseProjekti.velho,
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
              kategoriaId: "osa_a",
            },
          ],
        },
      };
      const status = await GetProjektiStatus.getProjektiStatus(projekti);
      expect(status).to.eql(API.Status.HYVAKSYTTY);
    }
  );

  it("returns HYVAKSYTTY if käsittelyn tila has hyväksymispäätös info, nähtävilläolo is migrated and hyväksymisvaihe aineistot is ok", async () => {
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
          tila: API.KuulutusJulkaisuTila.MIGROITU,
          id: 1,
          kuulutusYhteystiedot: {},
          yhteystiedot: [],
          velho: baseProjekti.velho,
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
            kategoriaId: "osa_a",
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.HYVAKSYTTY);
  });

  it("returns HYVAKSYTTY if it has not yet been one year after hyväksymispäätösjulkaisu kuulutusVaihePaattyyPaiva", async () => {
    MockDate.set("2001-01-01");
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
          tila: API.KuulutusJulkaisuTila.MIGROITU,
          id: 1,
          kuulutusYhteystiedot: {},
          yhteystiedot: [],
          velho: baseProjekti.velho,
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
            kategoriaId: "osa_a",
          },
        ],
      },
      hyvaksymisPaatosVaiheJulkaisut: [
        {
          id: 1,
          kuulutusYhteystiedot: {},
          yhteystiedot: [],
          velho: baseProjekti.velho,
          kuulutusVaihePaattyyPaiva: "2000-01-01",
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        },
      ],
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.HYVAKSYTTY);
  });

  it("returns EPAAKTIIVINEN_1 if hyväksymispäätösjulkaisu kuulutusVaihePaattyyPaiva has passed over a year ago", async () => {
    MockDate.set("2001-01-02");
    const projekti = {
      ...baseProjekti,
      hyvaksymisPaatosVaiheJulkaisut: [
        {
          kuulutusVaihePaattyyPaiva: "2000-01-01",
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
          id: 1,
          kuulutusYhteystiedot: {},
          yhteystiedot: [],
          velho: baseProjekti.velho,
        },
      ],
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.EPAAKTIIVINEN_1);
  });

  it("returns JATKOPAATOS_1_AINEISTOT if kasittelyn tila has jatkopäätös 1 info, but jatkopäätösvaihe aineistot has uncategorised aineistoNahtavilla", async () => {
    MockDate.set("2001-01-02");
    const projekti = {
      ...baseProjekti,
      kasittelynTila: {
        ensimmainenJatkopaatos: {
          paatoksenPvm: "2000-01-01",
          asianumero: "asianumero",
        },
      },
      jatkoPaatos1Vaihe: {
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
    expect(status).to.eql(API.Status.JATKOPAATOS_1_AINEISTOT);
  });

  it("returns JATKOPAATOS_1_AINEISTOT if kasittelyn tila has jatkopäätös 1 info, but jatkopäätösvaihe is missing hyvaksymisPaatos", async () => {
    MockDate.set("2001-01-02");
    const projekti = {
      ...baseProjekti,
      kasittelynTila: {
        ensimmainenJatkopaatos: {
          paatoksenPvm: "2000-01-01",
          asianumero: "asianumero",
        },
      },
      jatkoPaatos1Vaihe: {
        id: 1,
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            nimi: "Nimi",
            uuid: "1",
            tila: API.AineistoTila.VALMIS,
            kategoriaId: "osa_a",
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.JATKOPAATOS_1_AINEISTOT);
  });

  it("returns JATKOPAATOS_1_AINEISTOT if kasittelyn tila has jatkopäätös 1 info, but jatkopäätösvaihe is missing aineistoNahtavilla", async () => {
    MockDate.set("2001-01-02");
    const projekti = {
      ...baseProjekti,
      kasittelynTila: {
        ensimmainenJatkopaatos: {
          paatoksenPvm: "2000-01-01",
          asianumero: "asianumero",
        },
      },
      jatkoPaatos1Vaihe: {
        id: 1,
        hyvaksymisPaatos: [
          {
            dokumenttiOid: "2",
            nimi: "Nimi2",
            uuid: "2",
            tila: API.AineistoTila.VALMIS,
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.JATKOPAATOS_1_AINEISTOT);
  });

  it("returns JATKOPAATOS_1 if kasittelyn tila has jatkopäätös 1 info and jatkopäätösvaihe aineistot is ok", async () => {
    const projekti = {
      ...baseProjekti,
      kasittelynTila: {
        ensimmainenJatkopaatos: {
          paatoksenPvm: "2000-01-01",
          asianumero: "asianumero",
        },
      },
      jatkoPaatos1Vaihe: {
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
            kategoriaId: "osa_a",
          },
        ],
      },
      jatkoPaatos1VaiheJulkaisut: [
        {
          tila: API.KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
          id: 1,
          kuulutusYhteystiedot: {},
          yhteystiedot: [],
          velho: baseProjekti.velho,
          aineistoNahtavilla: [
            {
              dokumenttiOid: "1",
              nimi: "Nimi",
              uuid: "1",
              tila: API.AineistoTila.VALMIS,
              kategoriaId: "osa_a",
            },
          ],
        },
      ],
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.JATKOPAATOS_1);
  });

  it("returns JATKOPAATOS_1 if jatkopäätös 1 is published but it has not yet been 6 months has passed since jatkopaatos1 kuulutusVaihePaattyyPaiva", async () => {
    MockDate.set("2000-07-01");
    const projekti = {
      ...baseProjekti,
      kasittelynTila: {
        ensimmainenJatkopaatos: {
          paatoksenPvm: "2000-01-01",
          asianumero: "asianumero",
        },
      },
      jatkoPaatos1Vaihe: {
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
            kategoriaId: "osa_a",
          },
        ],
      },
      jatkoPaatos1VaiheJulkaisut: [
        {
          id: 1,
          kuulutusYhteystiedot: {},
          yhteystiedot: [],
          velho: baseProjekti.velho,
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
          kuulutusVaihePaattyyPaiva: "2000-01-01",
          aineistoNahtavilla: [
            {
              dokumenttiOid: "1",
              nimi: "Nimi",
              uuid: "1",
              tila: API.AineistoTila.VALMIS,
              kategoriaId: "osa_a",
            },
          ],
        },
      ],
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.JATKOPAATOS_1);
  });

  it("returns EPAAKTIIVINEN_2 if jatkopäätös 1 is published and 6 months has passed since jatkopaatos1 kuulutusVaihePaattyyPaiva", async () => {
    MockDate.set("2000-07-02");
    const projekti = {
      ...baseProjekti,
      kasittelynTila: {
        ensimmainenJatkopaatos: {
          paatoksenPvm: "2000-01-01",
          asianumero: "asianumero",
        },
      },
      jatkoPaatos1VaiheJulkaisut: [
        {
          id: 1,
          kuulutusYhteystiedot: {},
          yhteystiedot: [],
          velho: baseProjekti.velho,
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
          kuulutusVaihePaattyyPaiva: "2000-01-01",
        },
      ],
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.EPAAKTIIVINEN_2);
  });

  it("returns JATKOPAATOS_2_AINEISTOT if käsittelyn tila has jatkopäätös 2 info, but jatkopäätös 2 vaihe aineistot has uncategorized aineistoNahtavilla", async () => {
    const projekti = {
      ...baseProjekti,
      kasittelynTila: {
        toinenJatkopaatos: {
          paatoksenPvm: "2000-01-01",
          asianumero: "asianumero",
        },
      },
      jatkoPaatos2Vaihe: {
        id: 1,
        kuulutusYhteystiedot: {},
        yhteystiedot: [],
        velho: baseProjekti.velho,
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
    expect(status).to.eql(API.Status.JATKOPAATOS_2_AINEISTOT);
  });

  it("returns JATKOPAATOS_2_AINEISTOT if käsittelyn tila has jatkopäätös 2 info, but jatkopäätös 2 vaihe is missing hyvaksymisPaatos", async () => {
    const projekti = {
      ...baseProjekti,
      kasittelynTila: {
        toinenJatkopaatos: {
          paatoksenPvm: "2000-01-01",
          asianumero: "asianumero",
        },
      },
      jatkoPaatos2Vaihe: {
        id: 1,
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1",
            nimi: "Nimi",
            uuid: "1",
            tila: API.AineistoTila.VALMIS,
            kategoriaId: "osa_a",
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.JATKOPAATOS_2_AINEISTOT);
  });

  it("returns JATKOPAATOS_2_AINEISTOT if käsittelyn tila has jatkopäätös 2 info, but jatkopäätös 2 vaihe is missing aineistoNahtavilla", async () => {
    const projekti = {
      ...baseProjekti,
      kasittelynTila: {
        toinenJatkopaatos: {
          paatoksenPvm: "2000-01-01",
          asianumero: "asianumero",
        },
      },
      jatkoPaatos2Vaihe: {
        id: 1,
        hyvaksymisPaatos: [
          {
            dokumenttiOid: "2",
            nimi: "Nimi2",
            uuid: "2",
            tila: API.AineistoTila.VALMIS,
          },
        ],
      },
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.JATKOPAATOS_2_AINEISTOT);
  });

  it("returns JATKOPAATOS_2 if käsittelyn tila has jatkopäätös 2 info, but jatkopäätös 2 vaihe aineistot is ok", async () => {
    MockDate.set("2000-01-02");
    const projekti = {
      ...baseProjekti,
      kasittelynTila: {
        toinenJatkopaatos: {
          paatoksenPvm: "2000-01-01",
          asianumero: "asianumero",
        },
      },
      jatkoPaatos2Vaihe: {
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
            kategoriaId: "osa_a",
          },
        ],
      },
      jatkoPaatos2VaiheJulkaisut: [
        {
          id: 1,
          kuulutusYhteystiedot: {},
          yhteystiedot: [],
          velho: baseProjekti.velho,
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
          kuulutusVaihePaattyyPaiva: "2000-01-01",
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
              kategoriaId: "osa_a",
            },
          ],
        },
      ],
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.JATKOPAATOS_2);
  });

  it("returns JATKOPAATOS_2 if jatkopäätös 2 is published but it has not yet been 6 months since jatkopaatos2 kuulutusVaihePaattyyPaiva", async () => {
    MockDate.set("2000-07-01");
    const projekti = {
      ...baseProjekti,
      kasittelynTila: {
        toinenJatkopaatos: {
          paatoksenPvm: "2000-01-01",
          asianumero: "asianumero",
        },
      },
      jatkoPaatos2Vaihe: {
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
            kategoriaId: "osa_a",
          },
        ],
      },
      jatkoPaatos2VaiheJulkaisut: [
        {
          id: 1,
          kuulutusYhteystiedot: {},
          yhteystiedot: [],
          velho: baseProjekti.velho,
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
          kuulutusVaihePaattyyPaiva: "2000-01-01",
          aineistoNahtavilla: [
            {
              dokumenttiOid: "1",
              nimi: "Nimi",
              uuid: "1",
              tila: API.AineistoTila.VALMIS,
              kategoriaId: "osa_a",
            },
          ],
        },
      ],
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.JATKOPAATOS_2);
  });

  it("returns EPAAKTIIVINEN_3 if jatkopäätös 2 is published and 6 months has passed since jatkopaatos2 kuulutusVaihePaattyyPaiva", async () => {
    MockDate.set("2000-07-02");
    const projekti = {
      ...baseProjekti,
      kasittelynTila: {
        toinenJatkopaatos: {
          paatoksenPvm: "2000-01-01",
          asianumero: "asianumero",
        },
      },
      jatkoPaatos2VaiheJulkaisut: [
        {
          id: 1,
          kuulutusYhteystiedot: {},
          yhteystiedot: [],
          velho: baseProjekti.velho,
          tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
          kuulutusVaihePaattyyPaiva: "2000-01-01",
          aineistoNahtavilla: [
            {
              dokumenttiOid: "1",
              nimi: "Nimi",
              uuid: "1",
              tila: API.AineistoTila.VALMIS,
              kategoriaId: "osa_a",
            },
          ],
        },
      ],
    };
    const status = await GetProjektiStatus.getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.EPAAKTIIVINEN_3);
  });
});
