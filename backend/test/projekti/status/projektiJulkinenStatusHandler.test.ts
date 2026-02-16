import { describe, it } from "mocha";
import * as API from "hassu-common/graphql/apiModel";
import { applyProjektiJulkinenStatus } from "../../../src/projekti/status/projektiJulkinenStatusHandler";
import { expect } from "chai";

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
});
