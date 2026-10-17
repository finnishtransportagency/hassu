// Contains code generated or recommended by Amazon Q
import { describe, it } from "mocha";
import * as API from "hassu-common/graphql/apiModel";
import { applyProjektiJulkinenStatus } from "../../../src/projekti/status/projektiJulkinenStatusHandler";
import { expect } from "chai";

const toiminnallinenVelho: API.VelhoJulkinen = {
  __typename: "VelhoJulkinen",
  tyyppi: API.ProjektiTyyppi.TOIMINNALLINEN,
};

const nahtavillaoloJulkaisu = (kuulutusPaiva: string, kuulutusVaihePaattyyPaiva: string): API.NahtavillaoloVaiheJulkaisuJulkinen => ({
  __typename: "NahtavillaoloVaiheJulkaisuJulkinen",
  id: 1,
  tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
  kuulutusPaiva,
  kuulutusVaihePaattyyPaiva,
  velho: { __typename: "VelhoJulkinen" },
  yhteystiedot: [],
});

const hyvaksymisPaatosJulkaisu = (kuulutusPaiva: string, kuulutusVaihePaattyyPaiva: string): API.HyvaksymisPaatosVaiheJulkaisuJulkinen => ({
  __typename: "HyvaksymisPaatosVaiheJulkaisuJulkinen",
  id: 1,
  tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
  kuulutusPaiva,
  kuulutusVaihePaattyyPaiva,
  velho: { __typename: "VelhoJulkinen" },
  yhteystiedot: [],
});

describe("applyProjektiJulkinenStatus", () => {
  it("should set projekti status to ALOITUSKUULUTUS if aloituskuulutus has been published and vahainenMenettely = false", async () => {
    const projekti: Partial<API.ProjektiJulkinen> = {
      __typename: "ProjektiJulkinen",
      oid: "123",
      velho: {
        __typename: "VelhoJulkinen",
        asiatunnusVayla: "123",
        asiatunnusELY: "123",
      },
      vahainenMenettely: false,
      euRahoitus: false,
      aloitusKuulutusJulkaisu: {
        __typename: "AloitusKuulutusJulkaisuJulkinen",
        id: 1,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        kuulutusPaiva: "2000-01-01",
        yhteystiedot: [],
        velho: {
          __typename: "VelhoJulkinen",
        },
      },
    };
    applyProjektiJulkinenStatus(projekti as API.ProjektiJulkinen);
    expect(projekti.status).to.eql(API.Status.ALOITUSKUULUTUS);
  });

  it("should set projekti status to ALOITUSKUULUTUS if aloituskuulutus has been published and vahainenMenettely = true", async () => {
    const projekti: Partial<API.ProjektiJulkinen> = {
      __typename: "ProjektiJulkinen",
      oid: "123",
      velho: {
        __typename: "VelhoJulkinen",
        asiatunnusVayla: "123",
        asiatunnusELY: "123",
      },
      vahainenMenettely: true,
      euRahoitus: false,
      aloitusKuulutusJulkaisu: {
        __typename: "AloitusKuulutusJulkaisuJulkinen",
        id: 1,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        kuulutusPaiva: "2000-01-01",
        yhteystiedot: [],
        velho: {
          __typename: "VelhoJulkinen",
        },
      },
    };
    applyProjektiJulkinenStatus(projekti as API.ProjektiJulkinen);
    expect(projekti.status).to.eql(API.Status.ALOITUSKUULUTUS);
  });

  it("should set projekti status to NAHTAVILLAOLO if nahtavillaoloJulkaisu has been published and vahainenMenettely = true", async () => {
    const projekti: Partial<API.ProjektiJulkinen> = {
      __typename: "ProjektiJulkinen",
      oid: "123",
      velho: {
        __typename: "VelhoJulkinen",
        asiatunnusVayla: "123",
        asiatunnusELY: "123",
      },
      vahainenMenettely: true,
      euRahoitus: false,
      aloitusKuulutusJulkaisu: {
        __typename: "AloitusKuulutusJulkaisuJulkinen",
        id: 1,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        kuulutusPaiva: "2000-01-01",
        yhteystiedot: [],
        velho: {
          __typename: "VelhoJulkinen",
        },
      },
      nahtavillaoloVaihe: {
        __typename: "NahtavillaoloVaiheJulkaisuJulkinen",
        id: 1,
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
        kuulutusPaiva: "2000-01-01",
        velho: {
          __typename: "VelhoJulkinen",
        },
        yhteystiedot: [],
      },
    };
    applyProjektiJulkinenStatus(projekti as API.ProjektiJulkinen);
    expect(projekti.status).to.eql(API.Status.NAHTAVILLAOLO);
  });

  describe("TOIMINNALLINEN projekti", () => {
    it("should set status to EI_JULKAISTU when no nahtavillaolo julkaisu exists", () => {
      const projekti: Partial<API.ProjektiJulkinen> = {
        __typename: "ProjektiJulkinen",
        oid: "123",
        velho: toiminnallinenVelho,
      };
      applyProjektiJulkinenStatus(projekti as API.ProjektiJulkinen);
      expect(projekti.status).to.eql(API.Status.EI_JULKAISTU);
    });

    it("should set status to NAHTAVILLAOLO when nahtavillaolo kuulutusPaiva is in the past but kuulutusVaihePaattyyPaiva is not", () => {
      const projekti: Partial<API.ProjektiJulkinen> = {
        __typename: "ProjektiJulkinen",
        oid: "123",
        velho: toiminnallinenVelho,
        nahtavillaoloVaihe: nahtavillaoloJulkaisu("2000-01-01", "2099-01-01"),
      };
      applyProjektiJulkinenStatus(projekti as API.ProjektiJulkinen);
      expect(projekti.status).to.eql(API.Status.NAHTAVILLAOLO);
    });

    it("should set status to HYVAKSYMISMENETTELYSSA when nahtavillaolo kuulutusVaihePaattyyPaiva is in the past", () => {
      const projekti: Partial<API.ProjektiJulkinen> = {
        __typename: "ProjektiJulkinen",
        oid: "123",
        velho: toiminnallinenVelho,
        nahtavillaoloVaihe: nahtavillaoloJulkaisu("2000-01-01", "2000-02-01"),
      };
      applyProjektiJulkinenStatus(projekti as API.ProjektiJulkinen);
      expect(projekti.status).to.eql(API.Status.HYVAKSYMISMENETTELYSSA);
    });

    it("should set status to HYVAKSYTTY when hyvaksymispaatos kuulutusPaiva is in the past but kuulutusVaihePaattyyPaiva is not", () => {
      const projekti: Partial<API.ProjektiJulkinen> = {
        __typename: "ProjektiJulkinen",
        oid: "123",
        velho: toiminnallinenVelho,
        nahtavillaoloVaihe: nahtavillaoloJulkaisu("2000-01-01", "2000-02-01"),
        hyvaksymisPaatosVaihe: hyvaksymisPaatosJulkaisu("2000-03-01", "2099-01-01"),
      };
      applyProjektiJulkinenStatus(projekti as API.ProjektiJulkinen);
      expect(projekti.status).to.eql(API.Status.HYVAKSYTTY);
    });

    it("should set status to EPAAKTIIVINEN_1 when hyvaksymispaatos kuulutusVaihePaattyyPaiva is over a year in the past", () => {
      const projekti: Partial<API.ProjektiJulkinen> = {
        __typename: "ProjektiJulkinen",
        oid: "123",
        velho: toiminnallinenVelho,
        nahtavillaoloVaihe: nahtavillaoloJulkaisu("2000-01-01", "2000-02-01"),
        hyvaksymisPaatosVaihe: hyvaksymisPaatosJulkaisu("2000-03-01", "2000-04-01"),
      };
      applyProjektiJulkinenStatus(projekti as API.ProjektiJulkinen);
      expect(projekti.status).to.eql(API.Status.EPAAKTIIVINEN_1);
    });
  });
});
