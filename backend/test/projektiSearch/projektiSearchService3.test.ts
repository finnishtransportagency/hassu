import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../../src/database/model";
import sinon from "sinon";
import { projektiSearchService } from "../../src/projektiSearch/projektiSearchService";
import { parameters } from "../../src/aws/parameters";
import * as projektiSearchAdapter from "../../src/projektiSearch/projektiSearchAdapter";
import { expect } from "chai";
import openSearchClientYllapito from "../../src/projektiSearch/openSearchClientYllapito";
import { openSearchClientJulkinen } from "../../src/projektiSearch/openSearchClientJulkinen";
import { openSearchClientIlmoitustauluSyote } from "../../src/projektiSearch/openSearchClientIlmoitustauluSyote";
const projekti: DBProjekti = {
  oid: "1.2.246.578.5.1.2978288874.2711575506",
  asianhallinta: {
    inaktiivinen: false,
  },
  euRahoitus: true,
  euRahoitusLogot: {
    SUOMI: "/euLogot/FI/eu-logo.jpg",
    RUOTSI: "/euLogot/SV/eu-logo.jpg",
  },
  kasittelynTila: {
    ennakkoneuvotteluPaiva: "2023-10-10",
    ensimmainenJatkopaatos: {
      paatoksenPvm: "2022-09-03",
    },
    hyvaksymisesitysTraficomiinPaiva: "2023-10-11",
    hyvaksymispaatos: {
      paatoksenPvm: "2023-10-12",
      asianumero: "VÄYLÄ/1234/01.02.03/2022",
    },
    lainvoimaAlkaen: "2023-10-12",
    lainvoimaPaattyen: "2023-10-13",
    liikenteeseenluovutusOsittain: "2022-11-25",
    liikenteeseenluovutusKokonaan: "2022-11-25",

    suunnitelmanTila: "suunnitelman-tila/sutil13",
    toinenJatkopaatos: {
      paatoksenPvm: "2023-10-11",
    },
    valitustenMaara: 3,
  },
  kayttoOikeudet: [
    {
      tyyppi: API.KayttajaTyyppi.PROJEKTIPAALLIKKO,
      kayttajatunnus: "A000112",
      puhelinnumero: "0291111111",
      email: "mikko.haapamki@cgi.com",
      organisaatio: "CGI Suomi Oy",
      elyOrganisaatio: undefined,
      etunimi: "A-tunnus1",
      sukunimi: "Hassu",
      muokattavissa: false,
      yleinenYhteystieto: true,
    },
    {
      tyyppi: API.KayttajaTyyppi.VARAHENKILO,
      kayttajatunnus: "A000114",
      puhelinnumero: "0291111111",
      email: "mikko.haapamaki02@cgi.com",
      organisaatio: "CGI Suomi Oy",
      elyOrganisaatio: undefined,
      etunimi: "A-tunnus3",
      sukunimi: "Hassu",
      muokattavissa: false,
      yleinenYhteystieto: false,
    },
  ],
  kielitiedot: {
    ensisijainenKieli: API.Kieli.SUOMI,
    toissijainenKieli: API.Kieli.RUOTSI,
    projektinNimiVieraskielella: "HASSU AUTOMAATTITESTIPROJEKTI1 ruotsiksi",
  },
  lyhytOsoite: "r4r7",
  muistiinpano: "Testimuistiinpano",
  paivitetty: "2023-11-28T15:30:39+02:00",
  salt: "salt",
  suunnitteluSopimus: {
    kunta: 5,
    logo: {
      SUOMI: "/suunnittelusopimus/logo.png",
      RUOTSI: "/suunnittelusopimus/Screenshot 2023-09-28 at 12.24.31.png",
    },
    yhteysHenkilo: "A000112",
  },
  tyyppi: API.ProjektiTyyppi.TIE,
  vahainenMenettely: false,
  velho: {
    nimi: "HASSU AUTOMAATTITESTIPROJEKTI1",
    tyyppi: API.ProjektiTyyppi.TIE,
    kuvaus: null,
    vaylamuoto: ["tie"],
    asiatunnusVayla: "HASSU/123/2023",
    asiatunnusELY: null,
    suunnittelustaVastaavaViranomainen: API.SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
    toteuttavaOrganisaatio: null,
    vastuuhenkilonNimi: null,
    vastuuhenkilonEmail: "mikko.haapamki@cgi.com",
    varahenkilonNimi: null,
    varahenkilonEmail: "mikko.haapamaki02@cgi.com",
    maakunnat: [1],
    kunnat: [91, 92],
    linkki: "https://linkki-hankesivulle.fi",
    linkitetytProjektit: null,
  },
  versio: 14,
};

describe("ProjektiSearchService", () => {
  
  beforeEach(() => {
    sinon.reset();
    sinon.restore();
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it("should put projekti into public index if it has no aloituskuulutusjulkaisu", async () => {
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(openSearchClientYllapito, "putDocument");
    sinon.stub(openSearchClientJulkinen[API.Kieli.SUOMI], "deleteDocument");
    sinon.stub(openSearchClientJulkinen[API.Kieli.RUOTSI], "deleteDocument");
    sinon.stub(openSearchClientIlmoitustauluSyote, "putDocument");
    sinon.stub(openSearchClientIlmoitustauluSyote, "deleteDocument");
    sinon.stub(openSearchClientIlmoitustauluSyote, "query").resolves({ status: 200 });
    const adaptToJulkinenIndexStub = sinon.stub(projektiSearchAdapter, "adaptProjektiToJulkinenIndex");
    await projektiSearchService.indexProjekti(projekti);
    expect(adaptToJulkinenIndexStub.notCalled);
    sinon.reset();
    sinon.restore();
  });
});
