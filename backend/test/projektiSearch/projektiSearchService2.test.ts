import { describe, it } from "mocha";
import { projektiSearchService } from "../../src/projektiSearch/projektiSearchService";
import * as sinon from "sinon";
import {
  IlmoitettavaViranomainen,
  KaytettavaPalvelu,
  KayttajaTyyppi,
  Kieli,
  KuulutusJulkaisuTila,
  ProjektiTyyppi,
  Status,
  SuunnittelustaVastaavaViranomainen,
  VuorovaikutusKierrosTila,
  VuorovaikutusTilaisuusTyyppi,
} from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../../src/database/model";
import { ProjektiDocument } from "../../src/projektiSearch/projektiSearchAdapter";
import { kuntametadata } from "hassu-common/kuntametadata";
import { expect } from "chai";
import { createSandbox } from "sinon";
import { parameters } from "../../src/aws/parameters";
import openSearchClientYllapito from "../../src/projektiSearch/openSearchClientYllapito";
import { openSearchClientIlmoitustauluSyote } from "../../src/projektiSearch/openSearchClientIlmoitustauluSyote";
import { openSearchClientJulkinen } from "../../src/projektiSearch/openSearchClientJulkinen";

const sandbox = createSandbox();

describe("ProjektiSearchService", () => {
  let openSearchClientYllapitoStub: sinon.SinonStub;
  let openSearchClientJulkinenSuomiStub: sinon.SinonStub;

  before(() => {
    openSearchClientYllapitoStub = sandbox.stub(openSearchClientYllapito, "putDocument");
    sandbox.stub(openSearchClientIlmoitustauluSyote, "putDocument");
    openSearchClientJulkinenSuomiStub = sandbox.stub(openSearchClientJulkinen["SUOMI"], "putDocument");
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));
  });

  afterEach(() => {
    sandbox.reset();
  });

  after(() => {
    sandbox.restore();
  });

  it("should index projekti correctly", async () => {
    await projektiSearchService.indexProjekti(projektiKunSuunnitteluvaiheOnTallennettuJulkaistavaksi);
    expect(openSearchClientJulkinenSuomiStub.calledWith("1.2.246.578.5.1.2724991921.3534113206", julkinenIndeksi)).to.be.true;
    expect(openSearchClientYllapitoStub.calledOnce).to.be.true;
  });
});

const ilmajokiSeinajoki = kuntametadata.idsForKuntaNames(["Ilmajoki", " Seinäjoki"]);
const uusimaa = kuntametadata.idsForMaakuntaNames(["Uusimaa"]);

const julkinenIndeksi: Omit<ProjektiDocument, "oid"> = {
  nimi: "Vastuun testiprojekti 0709",
  hankkeenKuvaus: "asdgdrgh",
  projektiTyyppi: ProjektiTyyppi.TIE,
  kunnat: ilmajokiSeinajoki,
  maakunnat: uusimaa,
  vaihe: Status.ALOITUSKUULUTUS,
  viimeinenTilaisuusPaattyy: undefined,
  vaylamuoto: ["tie"],
  paivitetty: "2022-10-12T14:48:10+03:00",
  viimeisinJulkaisu: "2022-10-10",
  publishTimestamp: "2022-10-10T00:00:00+03:00",
  saame: false,
};

const projektiKunSuunnitteluvaiheOnTallennettuJulkaistavaksi: DBProjekti = {
  oid: "1.2.246.578.5.1.2724991921.3534113206",
  versio: 1,
  paivitetty: "2022-10-12T14:48:10+03:00",
  muistiinpano: "",
  vaihe: undefined,
  tyyppi: ProjektiTyyppi.TIE,
  aloitusKuulutus: {
    id: 1,
    kuulutusPaiva: "2022-10-10",
    siirtyySuunnitteluVaiheeseen: "2022-11-09",
    hankkeenKuvaus: {
      SUOMI: "asdgdrgh",
      RUOTSI: undefined,
    },
    kuulutusYhteystiedot: undefined,
    palautusSyy: undefined,
    ilmoituksenVastaanottajat: {
      kunnat: [],
      viranomaiset: [
        {
          nimi: IlmoitettavaViranomainen.VAYLAVIRASTO,
          sahkoposti: "email@vayla.fi",
          lahetetty: undefined,
        },
      ],
    },
  },
  aloitusKuulutusJulkaisut: [
    {
      id: 1,
      kuulutusPaiva: "2022-10-10",
      siirtyySuunnitteluVaiheeseen: "2022-11-09",
      hankkeenKuvaus: {
        SUOMI: "asdgdrgh",
        RUOTSI: undefined,
      },
      yhteystiedot: [
        {
          etunimi: "Vastuu",
          sukunimi: "Henkilo",
          organisaatio: "Väylävirasto",
          puhelinnumero: "0291234567",
          sahkoposti: "vastuu.henkilo@vayla.fi",
          titteli: undefined,
        },
      ],
      velho: {
        nimi: "Vastuun testiprojekti 0709",
        tyyppi: ProjektiTyyppi.TIE,
        kuvaus: undefined,
        vaylamuoto: ["tie"],
        asiatunnusVayla: undefined,
        asiatunnusELY: undefined,
        suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
        toteuttavaOrganisaatio: undefined,
        vastuuhenkilonNimi: undefined,
        vastuuhenkilonEmail: "vastuu.henkilo@vayla.fi",
        varahenkilonNimi: undefined,
        varahenkilonEmail: "vara.tyyppi@vayla.fi",
        kunnat: ilmajokiSeinajoki,
        maakunnat: uusimaa,
        linkki: undefined,
      },
      suunnitteluSopimus: undefined,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: undefined,
        projektinNimiVieraskielella: undefined,
      },
      aloituskuulutusPDFt: {
        SUOMI: {
          aloituskuulutusPDFPath: "/aloituskuulutus/1/T412 Aloituskuulutus.pdf",
          aloituskuulutusIlmoitusPDFPath: "/aloituskuulutus/1/T412_1 Ilmoitus aloituskuulutuksesta.pdf",
        },
        RUOTSI: undefined,
      },
      tila: KuulutusJulkaisuTila.HYVAKSYTTY,
      muokkaaja: "A000112",
      hyvaksyja: "A000112",
      ilmoituksenVastaanottajat: {
        kunnat: [],
        viranomaiset: [
          {
            nimi: IlmoitettavaViranomainen.VAYLAVIRASTO,
            sahkoposti: "email@vayla.fi",
            lahetetty: "2022-10-11T16:17",
          },
        ],
      },
      kuulutusYhteystiedot: {},
    },
  ],
  suunnitteluSopimus: undefined,
  vuorovaikutusKierros: {
    vuorovaikutusNumero: 1,
    hankkeenKuvaus: {
      SUOMI: "asdgdrgh",
      RUOTSI: undefined,
    },
    arvioSeuraavanVaiheenAlkamisesta: {
      SUOMI: "Pian",
    },
    suunnittelunEteneminenJaKesto: null,
    tila: VuorovaikutusKierrosTila.JULKINEN,
    palautteidenVastaanottajat: undefined,
    vuorovaikutusTilaisuudet: [
      {
        tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
        nimi: undefined,
        paivamaara: "2022-10-28",
        alkamisAika: "16:18",
        paattymisAika: "17:18",
        kaytettavaPalvelu: KaytettavaPalvelu.TEAMS,
        linkki: "https://www.fi",
        paikka: undefined,
        osoite: undefined,
        postinumero: undefined,
        postitoimipaikka: undefined,
        lisatiedot: undefined,
        esitettavatYhteystiedot: undefined,
      },
      {
        tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
        nimi: undefined,
        paivamaara: "2022-10-27",
        alkamisAika: "16:18",
        paattymisAika: "17:18",
        kaytettavaPalvelu: undefined,
        linkki: undefined,
        paikka: undefined,
        osoite: undefined,
        postinumero: undefined,
        postitoimipaikka: undefined,
        lisatiedot: undefined,
        esitettavatYhteystiedot: {
          yhteysHenkilot: ["L036511"],
          yhteysTiedot: [],
        },
      },
    ],
    vuorovaikutusJulkaisuPaiva: "2022-10-12",
    kysymyksetJaPalautteetViimeistaan: "2022-10-12",
    videot: [],
    suunnittelumateriaali: [
      {
        SUOMI: {
          nimi: "",
          url: "",
        },
      },
    ],
    esitettavatYhteystiedot: {
      yhteysTiedot: undefined,
      yhteysHenkilot: ["L036511"],
    },
    ilmoituksenVastaanottajat: {
      kunnat: [],
      viranomaiset: [
        {
          nimi: IlmoitettavaViranomainen.VAYLAVIRASTO,
          sahkoposti: "email@vayla.fi",
          lahetetty: undefined,
        },
      ],
    },
    aineistot: undefined,
  },
  vuorovaikutusKierrosJulkaisut: [
    {
      id: 1,
      hankkeenKuvaus: {
        SUOMI: "asdgdrgh",
        RUOTSI: undefined,
      },
      arvioSeuraavanVaiheenAlkamisesta: {
        SUOMI: "Pian",
      },
      suunnittelunEteneminenJaKesto: null,
      vuorovaikutusTilaisuudet: [
        {
          tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
          nimi: undefined,
          paivamaara: "2022-10-28",
          alkamisAika: "16:18",
          paattymisAika: "17:18",
          kaytettavaPalvelu: KaytettavaPalvelu.TEAMS,
          linkki: "https://www.fi",
          paikka: undefined,
          osoite: undefined,
          postinumero: undefined,
          postitoimipaikka: undefined,
          lisatiedot: undefined,
          yhteystiedot: undefined,
        },
        {
          tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
          nimi: undefined,
          paivamaara: "2022-10-27",
          alkamisAika: "16:18",
          paattymisAika: "17:18",
          kaytettavaPalvelu: undefined,
          linkki: undefined,
          paikka: undefined,
          osoite: undefined,
          postinumero: undefined,
          postitoimipaikka: undefined,
          lisatiedot: undefined,
          yhteystiedot: [
            {
              puhelinnumero: "0291234567",
              sahkoposti: "vastuu.henkilo@vayla.fi",
              organisaatio: "Väylävirasto",
              etunimi: "Vastuu",
              sukunimi: "Henkilo",
            },
          ],
        },
      ],
      vuorovaikutusJulkaisuPaiva: "2022-10-12",
      kysymyksetJaPalautteetViimeistaan: "2022-10-12",
      videot: [],
      suunnittelumateriaali: [
        {
          SUOMI: {
            nimi: "",
            url: "",
          },
        },
      ],
      yhteystiedot: [
        {
          puhelinnumero: "0291234567",
          sahkoposti: "vastuu.henkilo@vayla.fi",
          organisaatio: "Väylävirasto",
          etunimi: "Vastuu",
          sukunimi: "Henkilo",
        },
      ],
      ilmoituksenVastaanottajat: {
        kunnat: [],
        viranomaiset: [
          {
            nimi: IlmoitettavaViranomainen.VAYLAVIRASTO,
            sahkoposti: "email@vayla.fi",
            lahetetty: undefined,
          },
        ],
      },
      aineistot: undefined,
      vuorovaikutusPDFt: {
        SUOMI: {
          kutsuPDFPath: "/suunnitteluvaihe/vuorovaikutus_1/kutsu/TS Tie Yleisotilaisuus kutsu.pdf",
        },
        RUOTSI: undefined,
      },
      esitettavatYhteystiedot: {},
    },
  ],
  nahtavillaoloVaihe: undefined,
  nahtavillaoloVaiheJulkaisut: undefined,
  hyvaksymisPaatosVaihe: undefined,
  hyvaksymisPaatosVaiheJulkaisut: undefined,
  jatkoPaatos1Vaihe: undefined,
  jatkoPaatos1VaiheJulkaisut: undefined,
  jatkoPaatos2Vaihe: undefined,
  jatkoPaatos2VaiheJulkaisut: undefined,
  velho: {
    nimi: "Vastuun testiprojekti 0709",
    tyyppi: ProjektiTyyppi.TIE,
    kuvaus: undefined,
    vaylamuoto: ["tie"],
    asiatunnusVayla: undefined,
    asiatunnusELY: undefined,
    suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
    toteuttavaOrganisaatio: undefined,
    vastuuhenkilonNimi: undefined,
    vastuuhenkilonEmail: "vastuu.henkilo@vayla.fi",
    varahenkilonNimi: undefined,
    varahenkilonEmail: "vara.tyyppi@vayla.fi",
    kunnat: ilmajokiSeinajoki,
    maakunnat: uusimaa,
    linkki: undefined,
  },
  kayttoOikeudet: [
    {
      tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
      kayttajatunnus: "L036511",
      puhelinnumero: "0291234567",
      email: "vastuu.henkilo@vayla.fi",
      organisaatio: "Väylävirasto",
      etunimi: "Vastuu",
      sukunimi: "Henkilo",
      muokattavissa: false,
      yleinenYhteystieto: undefined,
    },
    {
      tyyppi: KayttajaTyyppi.VARAHENKILO,
      kayttajatunnus: "L658321",
      puhelinnumero: "0291234567",
      email: "vara.tyyppi@vayla.fi",
      organisaatio: "Väylävirasto",
      etunimi: "Vara",
      sukunimi: "Tyyppi",
      muokattavissa: false,
      yleinenYhteystieto: undefined,
    },
    {
      tyyppi: KayttajaTyyppi.VARAHENKILO,
      kayttajatunnus: "A000112",
      puhelinnumero: "0299879867876",
      email: "joku.hlo@cgi.com",
      organisaatio: "CGI Suomi Oy",
      etunimi: "A-tunnus1",
      sukunimi: "Hassu",
      muokattavissa: true,
      yleinenYhteystieto: undefined,
    },
  ],
  tallennettu: true,
  euRahoitus: false,
  vahainenMenettely: false,
  kielitiedot: {
    ensisijainenKieli: Kieli.SUOMI,
    toissijainenKieli: undefined,
    projektinNimiVieraskielella: undefined,
  },
  kasittelynTila: {
    hyvaksymispaatos: {
      paatoksenPvm: "2022-10-08",
      asianumero: "1232354sdsdtf",
    },
    ensimmainenJatkopaatos: {
      paatoksenPvm: undefined,
      asianumero: undefined,
    },
    toinenJatkopaatos: {
      paatoksenPvm: undefined,
      asianumero: undefined,
    },
  },
};
