import { describe, it } from "mocha";
import * as API from "hassu-common/graphql/apiModel";
import { expect } from "chai";
import getProjektiStatus from "../../../src/projekti/status/getProjektiStatus";
import sinon from "sinon";
import { parameters } from "../../../src/aws/parameters";

describe.only("getProjektiStatus", () => {
  before(() => {
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
  });

  it("returns SUUNNITTELU if aloituskuulutus has been published and vahainenMenettely = false", async () => {
    const projekti = {
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
      aloitusKuulutus: {
        id: 1,
        muokkausTila: API.MuokkausTila.LUKU,
      },
      aloitusKuulutusJulkaisu: {
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
      },
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
    const status = await getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.SUUNNITTELU);
  });

  it("returns NAHTAVILLAOLO_AINEISTOT if aloituskuulutus has been published and vahainenMenettely = true", async () => {
    const projekti = {
      oid: "123",
      velho: {
        suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
        nimi: "Nimi",
        asiatunnusVayla: "123",
      },
      kielitiedot: {
        ensisijainenKieli: API.Kieli.SUOMI,
      },
      vahainenMenettely: true,
      euRahoitus: false,
      aloitusKuulutus: {
        id: 1,
        muokkausTila: API.MuokkausTila.LUKU,
      },
      aloitusKuulutusJulkaisu: {
        tila: API.KuulutusJulkaisuTila.HYVAKSYTTY,
      },
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
    const status = await getProjektiStatus(projekti);
    expect(status).to.eql(API.Status.NAHTAVILLAOLO_AINEISTOT);
  });
});
