import {
  AloitusKuulutusInput,
  AloitusKuulutusTila,
  IlmoitettavaViranomainen,
  IlmoituksenVastaanottajat,
  KaytettavaPalvelu,
  Kieli,
  Projekti,
  ProjektiKayttaja,
  ProjektiRooli,
  ProjektiTyyppi,
  Status,
  TallennaProjektiInput,
  Viranomainen,
  VuorovaikutusTilaisuusTyyppi,
  Yhteystieto,
} from "../../../common/graphql/apiModel";
import { DBProjekti } from "../../src/database/model/projekti";
import { Vuorovaikutus } from "../../src/database/model/suunnitteluVaihe";

const esitettavatYhteystiedot = [
  {
    etunimi: "Marko",
    sukunimi: "Koi",
    sahkoposti: "markku.koi@koi.com",
    organisaatio: "Kajaani",
    puhelinnumero: "0293121213",
  },
];

const ilmoituksenVastaanottajat: IlmoituksenVastaanottajat = {
  __typename: "IlmoituksenVastaanottajat",
  kunnat: [
    {
      sahkoposti: "mikkeli@mikke.li",
      lahetetty: "2022-03-11T14:54",
      nimi: "Mikkeli",
      __typename: "KuntaVastaanottaja",
    },
    {
      sahkoposti: "juva@ju.va",
      lahetetty: "2022-03-11T14:54",
      nimi: " Juva",
      __typename: "KuntaVastaanottaja",
    },
    {
      sahkoposti: "savonlinna@savonlin.na",
      lahetetty: "2022-03-11T14:54",
      nimi: " Savonlinna",
      __typename: "KuntaVastaanottaja",
    },
  ],
  viranomaiset: [
    {
      sahkoposti: "kirjaamo.etela-savo@ely-keskus.fi",
      lahetetty: "2022-03-11T14:54",
      nimi: IlmoitettavaViranomainen.ETELA_SAVO_ELY,
      __typename: "ViranomaisVastaanottaja",
    },
  ],
};

const esitettavatYhteystiedot2: Yhteystieto[] = [
  {
    __typename: "Yhteystieto",
    etunimi: "Etunimi",
    sukunimi: "Sukunimi",
    sahkoposti: "Etunimi.Sukunimi@vayla.fi",
    organisaatio: "",
    puhelinnumero: "0293121213",
    titteli: "Projektipäällikkö",
  },
  {
    __typename: "Yhteystieto",
    etunimi: "Joku",
    sukunimi: "Jokunen",
    sahkoposti: "Joku.Jokunen@vayla.fi",
    organisaatio: "",
    puhelinnumero: "02998765",
    titteli: "Konsultti",
  },
];

export class ProjektiFixture {
  public PROJEKTI1_NIMI = "Testiprojekti 1";
  public PROJEKTI1_MUISTIINPANO_1 = "Testiprojekti 1:n muistiinpano";
  public PROJEKTI1_OID = "1";
  public PROJEKTI2_NIMI = "Testiprojekti 2 email lahetys";
  public PROJEKTI2_OID = "2";

  static pekkaProjariProjektiKayttaja: ProjektiKayttaja = {
    __typename: "ProjektiKayttaja",
    kayttajatunnus: "A123",
    rooli: ProjektiRooli.PROJEKTIPAALLIKKO,
    nimi: "Projari, Pekka",
    email: "pekka.projari@vayla.fi",
    organisaatio: "Väylävirasto",
    puhelinnumero: "123456789",
    esitetaanKuulutuksessa: null,
  };

  static mattiMeikalainenProjektiKayttaja: ProjektiKayttaja = {
    __typename: "ProjektiKayttaja",
    kayttajatunnus: "A000111",
    rooli: ProjektiRooli.MUOKKAAJA,
    nimi: "Meikalainen, Matti",
    email: "Matti.Meikalainen@vayla.fi",
    organisaatio: "Väylävirasto",
    puhelinnumero: "123456789",
    esitetaanKuulutuksessa: null,
  };

  tallennaProjektiInput: TallennaProjektiInput = {
    oid: this.PROJEKTI1_OID,
  };

  projekti1: Projekti = {
    __typename: "Projekti",
    oid: this.PROJEKTI1_OID,
    velho: {
      __typename: "Velho",
      nimi: this.PROJEKTI1_NIMI,
      tyyppi: ProjektiTyyppi.TIE,
      maakunnat: ["Uusimaa", "Pirkanmaa"],
    },
    muistiinpano: this.PROJEKTI1_MUISTIINPANO_1,
    status: Status.EI_JULKAISTU,
    tallennettu: false,
    kayttoOikeudet: [ProjektiFixture.pekkaProjariProjektiKayttaja],
    kielitiedot: {
      __typename: "Kielitiedot",
      ensisijainenKieli: Kieli.SUOMI,
      toissijainenKieli: Kieli.RUOTSI,
      projektinNimiVieraskielella: "Heja sverige",
    },
    euRahoitus: false,
    liittyvatSuunnitelmat: [
      {
        __typename: "Suunnitelma",
        asiatunnus: "atunnus123",
        nimi: "Littyva suunnitelma 1 nimi",
      },
    ],
  };

  velhoprojekti1: DBProjekti = {
    oid: this.PROJEKTI1_OID,
    velho: {
      nimi: this.PROJEKTI1_NIMI,
      tyyppi: ProjektiTyyppi.TIE,
    },
    muistiinpano: this.PROJEKTI1_MUISTIINPANO_1,
    kayttoOikeudet: [],
  };

  aloitusKuulutusInput: AloitusKuulutusInput = {
    kuulutusPaiva: "2022-01-02",
    hankkeenKuvaus: { SUOMI: "Lorem Ipsum", RUOTSI: "På Svenska", SAAME: "Saameksi" },

    siirtyySuunnitteluVaiheeseen: "2999-01-01",
    esitettavatYhteystiedot,
  };

  dbProjekti1: DBProjekti = {
    kayttoOikeudet: [
      {
        rooli: ProjektiRooli.PROJEKTIPAALLIKKO,
        email: ProjektiFixture.pekkaProjariProjektiKayttaja.email,
        kayttajatunnus: ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
        nimi: ProjektiFixture.pekkaProjariProjektiKayttaja.nimi,
        puhelinnumero: ProjektiFixture.pekkaProjariProjektiKayttaja.puhelinnumero || "",
        organisaatio: ProjektiFixture.pekkaProjariProjektiKayttaja.organisaatio,
        esitetaanKuulutuksessa: ProjektiFixture.pekkaProjariProjektiKayttaja.esitetaanKuulutuksessa,
      },
      {
        rooli: ProjektiRooli.MUOKKAAJA,
        email: ProjektiFixture.mattiMeikalainenProjektiKayttaja.email,
        kayttajatunnus: ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
        nimi: ProjektiFixture.mattiMeikalainenProjektiKayttaja.nimi,
        puhelinnumero: ProjektiFixture.mattiMeikalainenProjektiKayttaja.puhelinnumero || "",
        organisaatio: ProjektiFixture.mattiMeikalainenProjektiKayttaja.organisaatio,
        esitetaanKuulutuksessa: ProjektiFixture.mattiMeikalainenProjektiKayttaja.esitetaanKuulutuksessa,
      },
    ],
    oid: this.PROJEKTI1_OID,
    velho: {
      nimi: this.PROJEKTI1_NIMI,
      tyyppi: ProjektiTyyppi.TIE,
      tilaajaOrganisaatio: "Uudenmaan ELY-keskus",
      suunnittelustaVastaavaViranomainen: Viranomainen.UUDENMAAN_ELY,
      kunnat: ["Tampere", "Nokia"],
      maakunnat: ["Uusimaa", "Pirkanmaa"],
      vaylamuoto: ["tie"],
      asiatunnusVayla: "A" + this.PROJEKTI1_OID,
    },
    muistiinpano: this.PROJEKTI1_MUISTIINPANO_1,
    suunnitteluSopimus: {
      email: "Joku.Jossain@vayla.fi",
      puhelinnumero: "123",
      etunimi: "Joku",
      sukunimi: "Jossain",
      kunta: "Nokia",
    },
    aloitusKuulutus: {
      kuulutusPaiva: "2022-01-02",
      hankkeenKuvaus: {
        SUOMI: "Lorem Ipsum",
        RUOTSI: "På svenska",
        SAAME: "Saameksi",
      },
      siirtyySuunnitteluVaiheeseen: "2022-01-01",
      esitettavatYhteystiedot,
    },
    kielitiedot: {
      ensisijainenKieli: Kieli.SUOMI,
      toissijainenKieli: Kieli.RUOTSI,
      projektinNimiVieraskielella: "Namnet på svenska",
    },
    euRahoitus: false,
    liittyvatSuunnitelmat: [
      {
        asiatunnus: "atunnus123",
        nimi: "Littyva suunnitelma 1 nimi",
      },
    ],
    paivitetty: "2022-03-15T13:00:00.000Z",
  };

  dbProjekti2: DBProjekti = {
    kayttoOikeudet: [
      {
        rooli: ProjektiRooli.PROJEKTIPAALLIKKO,
        email: ProjektiFixture.pekkaProjariProjektiKayttaja.email,
        kayttajatunnus: ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
        nimi: ProjektiFixture.pekkaProjariProjektiKayttaja.nimi,
        puhelinnumero: ProjektiFixture.pekkaProjariProjektiKayttaja.puhelinnumero || "",
        organisaatio: ProjektiFixture.pekkaProjariProjektiKayttaja.organisaatio,
        esitetaanKuulutuksessa: ProjektiFixture.pekkaProjariProjektiKayttaja.esitetaanKuulutuksessa,
      },
      {
        rooli: ProjektiRooli.MUOKKAAJA,
        email: ProjektiFixture.mattiMeikalainenProjektiKayttaja.email,
        kayttajatunnus: ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
        nimi: ProjektiFixture.mattiMeikalainenProjektiKayttaja.nimi,
        puhelinnumero: ProjektiFixture.mattiMeikalainenProjektiKayttaja.puhelinnumero || "",
        organisaatio: ProjektiFixture.mattiMeikalainenProjektiKayttaja.organisaatio,
        esitetaanKuulutuksessa: ProjektiFixture.mattiMeikalainenProjektiKayttaja.esitetaanKuulutuksessa,
      },
    ],
    oid: this.PROJEKTI2_OID,
    velho: {
      nimi: this.PROJEKTI2_NIMI,
      tyyppi: ProjektiTyyppi.TIE,
      tilaajaOrganisaatio: "Uudenmaan ELY-keskus",
      kunnat: ["Mikkeli", "Juva", "Savonlinna"],
      vaylamuoto: ["tie"],
      vastuuhenkilonEmail: ProjektiFixture.pekkaProjariProjektiKayttaja.email,
      maakunnat: ["Uusimaa", "Pirkanmaa"],
    },
    aloitusKuulutusJulkaisut: [
      {
        aloituskuulutusPDFt: {
          SUOMI: {
            aloituskuulutusIlmoitusPDFPath:
              "/aloituskuulutus/ILMOITUS TOIMIVALTAISEN VIRANOMAISEN KUULUTUKSESTA Marikan testiprojekti.pdf",
            aloituskuulutusPDFPath: "/aloituskuulutus/KUULUTUS SUUNNITTELUN ALOITTAMISESTA Marikan testiprojekti.pdf",
          },
          RUOTSI: {
            aloituskuulutusIlmoitusPDFPath:
              "/aloituskuulutus/MEDDELANDE OM KUNGORELSE FRAN BEHORIG MYNDIGHET Marikas testprojekt.pdf",
            aloituskuulutusPDFPath: "/aloituskuulutus/KUNGORELSE OM INLEDANDET AV PLANERINGEN Marikas testprojekt.pdf",
          },
        },
        kielitiedot: {
          projektinNimiVieraskielella: "Marikas testprojekt",
          toissijainenKieli: Kieli.RUOTSI,
          ensisijainenKieli: Kieli.SUOMI,
        },
        ilmoituksenVastaanottajat,
        kuulutusPaiva: "2022-03-28T14:28",
        muokkaaja: ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
        hyvaksyja: ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
        hankkeenKuvaus: {
          SUOMI:
            "Suunnittelu kohde on osa Hyvinkää-Hanko sähköistyshanketta, jossa toteutetaan myös tasoristeysten toimenpiteitä. Hyväksytyssä ratasuunnitelmassa kyseisessä kohdassa on hyväksytty suunnitelmaratkaisuna Kisan seisakkeen ja Leksvallin tasoristeysten poistaminen parantamalla Helmströmin tasoristeyksen kohdalle uusi tasoristeys. Nyt käynnistetään Rata-suunnitelman päivitys kyseisessä kohdassa ja suunnitellaan kaikkien kolmen tasoristeyksen poistaminen uudella Leksvallin ylikulkusillalla.",
          RUOTSI:
            "Designplatsen är en del av elektrifieringsprojektet Hyvinge-Hangö, som också kommer att genomföra plankorsningsåtgärder. I den fastställda spårplanen är borttagandet av tävlingsstoppet och Leksvallskorsningen genom förbättring av en ny plankorsning vid Helmströms plankorsning vid denna punkt godkänd som planlösning. En uppdatering av Spårplanen kommer nu att lanseras då och man planerar att ta bort alla tre plankorsningarna på den nya Leksvallsöverfarten.",
          SAAME: null,
        },
        yhteystiedot: [
          {
            sukunimi: "Ojanen",
            sahkoposti: "marika.ojanen@vayla.fi",
            puhelinnumero: "0299878787",
            organisaatio: "Väylävirasto",
            etunimi: "Marika",
          },
        ],
        velho: {
          tilaajaOrganisaatio: "Väylävirasto",
          vaylamuoto: ["tie"],
          nimi: "Marikan testiprojekti",
          tyyppi: ProjektiTyyppi.YLEINEN,
          kunnat: ["Mikkeli", " Juva", " Savonlinna"],
        },
        id: 1,
        tila: AloitusKuulutusTila.HYVAKSYTTY,
        siirtyySuunnitteluVaiheeseen: "2022-04-28T14:28",
      },
    ],
    aloitusKuulutus: {
      hankkeenKuvaus: {
        SUOMI:
          "Suunnittelu kohde on osa Hyvinkää-Hanko sähköistyshanketta, jossa toteutetaan myös tasoristeysten toimenpiteitä. Hyväksytyssä ratasuunnitelmassa kyseisessä kohdassa on hyväksytty suunnitelmaratkaisuna Kisan seisakkeen ja Leksvallin tasoristeysten poistaminen parantamalla Helmströmin tasoristeyksen kohdalle uusi tasoristeys. Nyt käynnistetään Rata-suunnitelman päivitys kyseisessä kohdassa ja suunnitellaan kaikkien kolmen tasoristeyksen poistaminen uudella Leksvallin ylikulkusillalla.",
        RUOTSI:
          "Designplatsen är en del av elektrifieringsprojektet Hyvinge-Hangö, som också kommer att genomföra plankorsningsåtgärder. I den fastställda spårplanen är borttagandet av tävlingsstoppet och Leksvallskorsningen genom förbättring av en ny plankorsning vid Helmströms plankorsning vid denna punkt godkänd som planlösning. En uppdatering av Spårplanen kommer nu att lanseras då och man planerar att ta bort alla tre plankorsningarna på den nya Leksvallsöverfarten.",
        SAAME: null,
      },
      ilmoituksenVastaanottajat: {
        __typename: "IlmoituksenVastaanottajat",
        kunnat: [
          {
            nimi: "Mikkeli",
            sahkoposti: "mikkeli@mikke.li",
            __typename: "KuntaVastaanottaja",
          },
          {
            nimi: " Juva",
            sahkoposti: "juva@ju.va",
            __typename: "KuntaVastaanottaja",
          },
          {
            nimi: " Savonlinna",
            sahkoposti: "savonlinna@savonlin.na",
            __typename: "KuntaVastaanottaja",
          },
        ],
        viranomaiset: [
          {
            nimi: IlmoitettavaViranomainen.ETELA_SAVO_ELY,
            sahkoposti: "kirjaamo.etela-savo@ely-keskus.fi",
            __typename: "ViranomaisVastaanottaja",
          },
        ],
      },
      kuulutusPaiva: "2022-03-28T14:28",
      siirtyySuunnitteluVaiheeseen: "2022-04-28T14:28",
      esitettavatYhteystiedot: [],
    },
    kielitiedot: {
      ensisijainenKieli: Kieli.SUOMI,
      toissijainenKieli: Kieli.RUOTSI,
      projektinNimiVieraskielella: "Namnet på svenska",
    },
    euRahoitus: false,
    liittyvatSuunnitelmat: [
      {
        asiatunnus: "atunnus123",
        nimi: "Littyva suunnitelma 1 nimi",
      },
    ],
    paivitetty: "2022-03-15T14:30:00.000Z",
  };

  hankkeenKuvausSuunnitteluVaiheessa = {
    SUOMI: "Hankkeen kuvaus suunnitteluvaiheessa",
    RUOTSI: "Hankkeen kuvaus suunnitteluvaiheessa ruotsiksi",
    SAAME: "Hankkeen kuvaus suunnitteluvaiheessa saameksi",
  };

  vuorovaikutus: Vuorovaikutus = {
    vuorovaikutusNumero: 1,
    julkinen: true,
    vuorovaikutusJulkaisuPaiva: "2022-03-23",
    videot: [{ nimi: "Esittely", url: "https://video" }],
    kysymyksetJaPalautteetViimeistaan: "2022-03-23T23:48",
    esitettavatYhteystiedot: [
      {
        etunimi: "Marko",
        sukunimi: "Koi",
        sahkoposti: "markku.koi@koi.com",
        organisaatio: "Kajaani",
        puhelinnumero: "0293121213",
      },
    ],
    ilmoituksenVastaanottajat,
    vuorovaikutusYhteysHenkilot: [
      ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
      ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
    ],
    vuorovaikutusTilaisuudet: [
      {
        tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
        nimi: "Lorem ipsum",
        paivamaara: "2022-03-04",
        alkamisAika: "15:00",
        paattymisAika: "16:00",
        kaytettavaPalvelu: KaytettavaPalvelu.TEAMS,
        linkki: "https://linkki_tilaisuuteen",
      },
      {
        tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
        nimi: "Lorem ipsum two",
        paivamaara: "2022-04-05",
        alkamisAika: "10:00",
        paattymisAika: "11:00",
        paikka: "Kunnantalo",
        osoite: "Katu 123",
        postinumero: "00100",
        postitoimipaikka: "Helsinki",
        Saapumisohjeet: "Ensimmäinen ovi vasemmalla",
      },
      {
        tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
        nimi: "Soittoaikatilaisuuden nimi tässä",
        paivamaara: "2022-04-05",
        alkamisAika: "10:00",
        paattymisAika: "11:00",
        esitettavatYhteystiedot: esitettavatYhteystiedot2,
        projektiYhteysHenkilot: [
          ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
          ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
        ],
      },
      {
        tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
        nimi: "Toisen soittoaikatilaisuuden nimi tässä",
        paivamaara: "2033-04-05",
        alkamisAika: "12:00",
        paattymisAika: "13:00",
        esitettavatYhteystiedot: esitettavatYhteystiedot2,
      },
    ],
  };
}
