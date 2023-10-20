import { describe, it } from "mocha";
import * as API from "hassu-common/graphql/apiModel";
import { applyProjektiStatus } from "../../../src/projekti/status/projektiStatusHandler";
import { expect } from "chai";
import sinon from "sinon";
import { parameters } from "../../../src/aws/parameters";

describe("applyProjektiStatus", () => {
  before(() => {
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
  });
  after(() => {
    sinon.restore();
  });
  it("should set projekti status to SUUNNITTELU if aloituskuulutus has been published and vahainenMenettely = false", async () => {
    const projekti: Partial<API.Projekti> = {
      __typename: "Projekti",
      oid: "123",
      velho: {
        __typename: "Velho",
        asiatunnusVayla: "123",
        asiatunnusELY: "123",
      },
      vahainenMenettely: false,
      euRahoitus: false,
      aloitusKuulutus: {
        __typename: "AloitusKuulutus",
        muokkausTila: API.MuokkausTila.LUKU,
      },
      kielitiedot: {
        __typename: "Kielitiedot",
        ensisijainenKieli: API.Kieli.SUOMI,
      },
      aloitusKuulutusJulkaisu: {
        __typename: "AloitusKuulutusJulkaisu",
        yhteystiedot: [],
        velho: {
          __typename: "Velho",
        },
        kuulutusYhteystiedot: { __typename: "StandardiYhteystiedot" },
      },
    };
    applyProjektiStatus(projekti as API.Projekti);
    expect(projekti.status).to.eql(API.Status.SUUNNITTELU);
  });

  it("should set projekti status to NAHTAVILLAOLO_AINEISTOT if aloituskuulutus has been published and vahainenMenettely = true", async () => {
    const projekti: Partial<API.Projekti> = {
      __typename: "Projekti",
      oid: "123",
      velho: {
        __typename: "Velho",
        asiatunnusVayla: "123",
        asiatunnusELY: "123",
      },
      kielitiedot: {
        __typename: "Kielitiedot",
        ensisijainenKieli: API.Kieli.SUOMI,
      },
      vahainenMenettely: true,
      euRahoitus: false,
      aloitusKuulutus: {
        __typename: "AloitusKuulutus",
        muokkausTila: API.MuokkausTila.LUKU,
      },
      aloitusKuulutusJulkaisu: {
        __typename: "AloitusKuulutusJulkaisu",
        yhteystiedot: [],
        velho: {
          __typename: "Velho",
        },
        kuulutusYhteystiedot: { __typename: "StandardiYhteystiedot" },
      },
    };
    applyProjektiStatus(projekti as API.Projekti);
    expect(projekti.status).to.eql(API.Status.NAHTAVILLAOLO_AINEISTOT);
  });
});
