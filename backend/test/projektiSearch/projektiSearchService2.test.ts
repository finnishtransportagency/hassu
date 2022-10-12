import { describe, it } from "mocha";
import { openSearchClientJulkinen, openSearchClientYllapito } from "../../src/projektiSearch/openSearchClient";
import { projektiSearchService } from "../../src/projektiSearch/projektiSearchService";
import * as sinon from "sinon";
import {
  AloitusKuulutusTila,
  IlmoitettavaViranomainen,
  KaytettavaPalvelu,
  KayttajaTyyppi,
  Kieli,
  ProjektiTyyppi,
  Status,
  Viranomainen,
  VuorovaikutusTilaisuusTyyppi,
} from "../../../common/graphql/apiModel";
import { DBProjekti } from "../../src/database/model";
import { ProjektiDocument } from "../../src/projektiSearch/projektiSearchAdapter";
import { parseDate } from "../../src/util/dateUtil";

const sandbox = require("sinon").createSandbox();

const { expect } = require("chai");

describe("ProjektiSearchService", () => {
  let openSearchClientYllapitoStub: sinon.SinonStub;
  let openSearchClientJulkinenSuomiStub: sinon.SinonStub;
  beforeEach(() => {
    openSearchClientYllapitoStub = sandbox.stub(openSearchClientYllapito, "putDocument");
    openSearchClientJulkinenSuomiStub = sandbox.stub(openSearchClientJulkinen["SUOMI"], "putDocument");
  });
  afterEach(() => {
    sandbox.reset();
    sandbox.restore();
  });

  it("should index projekti correctly", async () => {
    await projektiSearchService.indexProjekti(projektiKunSuunnitteluvaiheOnTallennettuJulkaistavaksi);
    expect(openSearchClientJulkinenSuomiStub.calledWith("1.2.246.578.5.1.2724991921.3534113206", julkinenIndeksi));
    expect(openSearchClientYllapitoStub.called);
  });
});

const julkinenIndeksi: Omit<ProjektiDocument, "oid"> = {
  nimi: "Elinan testiprojekti 0709",
  hankkeenKuvaus: "asdgdrgh",
  projektiTyyppi: ProjektiTyyppi.TIE,
  kunnat: ["Ilmajoki", " Seinäjoki"],
  maakunnat: ["Uusimaa"],
  vaihe: Status.SUUNNITTELU,
  viimeinenTilaisuusPaattyy: "2022-10-28 17:18",
  vaylamuoto: ["tie"],
  paivitetty: "2022-10-12T14:48:10+03:00",
  publishTimestamp: parseDate("2022-10-10").format(),
};

const projektiKunSuunnitteluvaiheOnTallennettuJulkaistavaksi: DBProjekti = {
  oid: "1.2.246.578.5.1.2724991921.3534113206",
  paivitetty: "2022-10-12T14:48:10+03:00",
  muistiinpano: "",
  vaihe: undefined,
  tyyppi: ProjektiTyyppi.TIE,
  suunnittelustaVastaavaViranomainen: undefined,
  aloitusKuulutus: {
    kuulutusPaiva: "2022-10-10",
    siirtyySuunnitteluVaiheeseen: "2022-11-09",
    hankkeenKuvaus: {
      SUOMI: "asdgdrgh",
      RUOTSI: undefined,
      SAAME: undefined,
    },
    kuulutusYhteystiedot: undefined,
    palautusSyy: undefined,
    ilmoituksenVastaanottajat: {
      kunnat: [],
      viranomaiset: [
        {
          nimi: IlmoitettavaViranomainen.VAYLAVIRASTO,
          sahkoposti: "kirjaamo@vayla.fi",
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
        SAAME: undefined,
      },
      yhteystiedot: [
        {
          etunimi: "Elina",
          sukunimi: "Manninen",
          organisaatio: "Väylävirasto",
          puhelinnumero: "0291234567",
          sahkoposti: "elina.manninen@vayla.fi",
          titteli: undefined,
        },
      ],
      velho: {
        nimi: "Elinan testiprojekti 0709",
        tyyppi: ProjektiTyyppi.TIE,
        kuvaus: undefined,
        vaylamuoto: ["tie"],
        asiatunnusVayla: undefined,
        asiatunnusELY: undefined,
        suunnittelustaVastaavaViranomainen: Viranomainen.VAYLAVIRASTO,
        toteuttavaOrganisaatio: undefined,
        vastuuhenkilonNimi: undefined,
        vastuuhenkilonEmail: "elina.manninen@vayla.fi",
        varahenkilonNimi: undefined,
        varahenkilonEmail: "marika.ojanen@vayla.fi",
        kunnat: ["Ilmajoki", " Seinäjoki"],
        maakunnat: ["Uusimaa"],
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
          aloituskuulutusPDFPath:
            "/yllapito/tiedostot/projekti/1.2.246.578.5.1.2724991921.3534113206/aloituskuulutus/T412 Aloituskuulutus.pdf",
          aloituskuulutusIlmoitusPDFPath:
            "/yllapito/tiedostot/projekti/1.2.246.578.5.1.2724991921.3534113206/aloituskuulutus/T412_1 Ilmoitus aloituskuulutuksesta.pdf",
        },
        RUOTSI: undefined,
        SAAME: undefined,
      },
      tila: AloitusKuulutusTila.HYVAKSYTTY,
      muokkaaja: "A000112",
      hyvaksyja: "A000112",
      ilmoituksenVastaanottajat: {
        kunnat: [],
        viranomaiset: [
          {
            nimi: IlmoitettavaViranomainen.VAYLAVIRASTO,
            sahkoposti: "kirjaamo@vayla.fi",
            lahetetty: "2022-10-11T16:17",
          },
        ],
      },
    },
  ],
  suunnitteluSopimus: undefined,
  vuorovaikutukset: [
    {
      vuorovaikutusNumero: 1,
      julkinen: true,
      vuorovaikutusTilaisuudet: [
        {
          tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
          nimi: undefined,
          paivamaara: "2022-10-28",
          alkamisAika: "16:18",
          paattymisAika: "17:18",
          kaytettavaPalvelu: KaytettavaPalvelu.TEAMS,
          linkki: "http://www.fi",
          paikka: undefined,
          osoite: undefined,
          postinumero: undefined,
          postitoimipaikka: undefined,
          Saapumisohjeet: undefined,
          esitettavatYhteystiedot: undefined,
        },
      ],
      vuorovaikutusJulkaisuPaiva: "2022-10-12",
      kysymyksetJaPalautteetViimeistaan: "2022-10-12",
      videot: [],
      suunnittelumateriaali: {
        nimi: "",
        url: "",
      },
      esitettavatYhteystiedot: {
        yhteysTiedot: undefined,
        yhteysHenkilot: ["L036511"],
      },
      ilmoituksenVastaanottajat: {
        kunnat: [],
        viranomaiset: [
          {
            nimi: IlmoitettavaViranomainen.VAYLAVIRASTO,
            sahkoposti: "kirjaamo@vayla.fi",
            lahetetty: undefined,
          },
        ],
      },
      esittelyaineistot: undefined,
      suunnitelmaluonnokset: undefined,
      vuorovaikutusPDFt: {
        SUOMI: {
          kutsuPDFPath:
            "/yllapito/tiedostot/projekti/1.2.246.578.5.1.2724991921.3534113206/suunnitteluvaihe/vuorovaikutus_1/kutsu/TS Tie Yleisotilaisuus kutsu.pdf",
        },
        RUOTSI: undefined,
        SAAME: undefined,
      },
    },
  ],
  suunnitteluVaihe: {
    hankkeenKuvaus: {
      SUOMI: "asdgdrgh",
      RUOTSI: undefined,
      SAAME: undefined,
    },
    arvioSeuraavanVaiheenAlkamisesta: "Pian",
    suunnittelunEteneminenJaKesto: "",
    julkinen: true,
    palautteidenVastaanottajat: undefined,
  },
  nahtavillaoloVaihe: undefined,
  nahtavillaoloVaiheJulkaisut: undefined,
  hyvaksymisPaatosVaihe: undefined,
  hyvaksymisPaatosVaiheJulkaisut: undefined,
  jatkoPaatos1Vaihe: undefined,
  jatkoPaatos1VaiheJulkaisut: undefined,
  jatkoPaatos2Vaihe: undefined,
  jatkoPaatos2VaiheJulkaisut: undefined,
  velho: {
    nimi: "Elinan testiprojekti 0709",
    tyyppi: ProjektiTyyppi.TIE,
    kuvaus: undefined,
    vaylamuoto: ["tie"],
    asiatunnusVayla: undefined,
    asiatunnusELY: undefined,
    suunnittelustaVastaavaViranomainen: Viranomainen.VAYLAVIRASTO,
    toteuttavaOrganisaatio: undefined,
    vastuuhenkilonNimi: undefined,
    vastuuhenkilonEmail: "elina.manninen@vayla.fi",
    varahenkilonNimi: undefined,
    varahenkilonEmail: "marika.ojanen@vayla.fi",
    kunnat: ["Ilmajoki", " Seinäjoki"],
    maakunnat: ["Uusimaa"],
    linkki: undefined,
  },
  kayttoOikeudet: [
    {
      tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
      kayttajatunnus: "L036511",
      puhelinnumero: "0291234567",
      email: "elina.manninen@vayla.fi",
      organisaatio: "Väylävirasto",
      nimi: "Manninen, Elina",
      muokattavissa: false,
      yleinenYhteystieto: undefined,
    },
    {
      tyyppi: KayttajaTyyppi.VARAHENKILO,
      kayttajatunnus: "L658321",
      puhelinnumero: "0291234567",
      email: "marika.ojanen@vayla.fi",
      organisaatio: "Väylävirasto",
      nimi: "Ojanen, Marika",
      muokattavissa: false,
      yleinenYhteystieto: undefined,
    },
    {
      tyyppi: KayttajaTyyppi.VARAHENKILO,
      kayttajatunnus: "A000112",
      puhelinnumero: "0299879867876",
      email: "mikko.haapamki@cgi.com",
      organisaatio: "CGI Suomi Oy",
      nimi: "Hassu, A-tunnus1",
      muokattavissa: true,
      yleinenYhteystieto: undefined,
    },
  ],
  tallennettu: true,
  euRahoitus: false,
  liittyvatSuunnitelmat: [],
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
