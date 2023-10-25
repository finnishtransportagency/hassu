import { describe, it } from "mocha";
import * as API from "hassu-common/graphql/apiModel";
import { applyProjektiStatus } from "../../../src/projekti/status/projektiStatusHandler";
import { expect } from "chai";

describe("applyProjektiStatus", () => {
  it("should set projekti status to SUUNNITTELU if aloituskuulutus has been published and vahainenMenettely = false", async () => {
    const projekti: API.Projekti = {
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
      versio: 1,
      asianhallinta: { __typename: "Asianhallinta", aktivoitavissa: false, inaktiivinen: true },
    };
    applyProjektiStatus(projekti);
    expect(projekti.status).to.eql(API.Status.SUUNNITTELU);
  });

  it("should set projekti status to NAHTAVILLAOLO_AINEISTOT if aloituskuulutus has been published and vahainenMenettely = true", async () => {
    const projekti: API.Projekti = {
      versio: 1,
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
      asianhallinta: { __typename: "Asianhallinta", aktivoitavissa: false, inaktiivinen: true },
    };
    applyProjektiStatus(projekti);
    expect(projekti.status).to.eql(API.Status.NAHTAVILLAOLO_AINEISTOT);
  });
});
