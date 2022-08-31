import {
  AineistoTila,
  AloitusKuulutusInput,
  AloitusKuulutusTila,
  HallintoOikeus,
  HyvaksymisPaatosVaiheTila,
  IlmoitettavaViranomainen,
  IlmoituksenVastaanottajat,
  KaytettavaPalvelu,
  Kieli,
  NahtavillaoloVaiheTila,
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
import { DBProjekti, Vuorovaikutus } from "../../src/database/model";
import cloneDeep from "lodash/cloneDeep";

export class ProjektiFixture {
  public PROJEKTI1_NIMI = "Testiprojekti 1";
  public PROJEKTI1_MUISTIINPANO_1 = "Testiprojekti 1:n muistiinpano";
  public PROJEKTI1_OID = "1";
  public PROJEKTI2_NIMI = "Testiprojekti 2";
  public PROJEKTI2_OID = "2";
  public PROJEKTI3_NIMI = "Testiprojekti 3";
  public PROJEKTI3_OID = "3";
  public PROJEKTI4_NIMI = "Testiprojekti 4";
  public PROJEKTI4_OID = "4";

  private yhteystietoLista = [
    {
      etunimi: "Marko",
      sukunimi: "Koi",
      sahkoposti: "markku.koi@koi.com",
      organisaatio: "Kajaani",
      puhelinnumero: "0293121213",
    },
  ];

  private ilmoituksenVastaanottajat: IlmoituksenVastaanottajat = {
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

  private yhteystietoLista2: Yhteystieto[] = [
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

  private static pekkaProjariProjektiKayttaja: ProjektiKayttaja = {
    __typename: "ProjektiKayttaja",
    kayttajatunnus: "A123",
    rooli: ProjektiRooli.PROJEKTIPAALLIKKO,
    nimi: "Projari, Pekka",
    email: "pekka.projari@vayla.fi",
    organisaatio: "Väylävirasto",
    puhelinnumero: "123456789",
  };

  private static mattiMeikalainenProjektiKayttaja: ProjektiKayttaja = {
    __typename: "ProjektiKayttaja",
    kayttajatunnus: "A000111",
    rooli: ProjektiRooli.MUOKKAAJA,
    nimi: "Meikalainen, Matti",
    email: "Matti.Meikalainen@vayla.fi",
    organisaatio: "Väylävirasto",
    puhelinnumero: "123456789",
  };

  tallennaProjektiInput: TallennaProjektiInput = {
    oid: this.PROJEKTI1_OID,
  };

  projekti1(): Projekti {
    return {
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
  }

  velhoprojekti1(): DBProjekti {
    return {
      oid: this.PROJEKTI1_OID,
      velho: {
        nimi: this.PROJEKTI1_NIMI,
        tyyppi: ProjektiTyyppi.TIE,
        vastuuhenkilonEmail: "pekka.projari@vayla.fi",
      },
      muistiinpano: this.PROJEKTI1_MUISTIINPANO_1,
      kayttoOikeudet: [
        {
          kayttajatunnus: "A123",
          rooli: ProjektiRooli.PROJEKTIPAALLIKKO,
          nimi: "Projari, Pekka",
          email: "pekka.projari@vayla.fi",
          organisaatio: "Väylävirasto",
          puhelinnumero: "123456789",
        },
      ],
    };
  }

  aloitusKuulutusInput: AloitusKuulutusInput = {
    kuulutusPaiva: "2022-01-02",
    hankkeenKuvaus: { SUOMI: "Lorem Ipsum", RUOTSI: "På Svenska", SAAME: "Saameksi" },

    siirtyySuunnitteluVaiheeseen: "2999-01-01",
    kuulutusYhteystiedot: {
      yhteysTiedot: this.yhteystietoLista,
    },
  };

  dbProjekti1(): DBProjekti {
    return {
      kayttoOikeudet: [
        {
          rooli: ProjektiRooli.PROJEKTIPAALLIKKO,
          email: ProjektiFixture.pekkaProjariProjektiKayttaja.email,
          kayttajatunnus: ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
          nimi: ProjektiFixture.pekkaProjariProjektiKayttaja.nimi,
          puhelinnumero: ProjektiFixture.pekkaProjariProjektiKayttaja.puhelinnumero || "",
          organisaatio: ProjektiFixture.pekkaProjariProjektiKayttaja.organisaatio,
        },
        {
          rooli: ProjektiRooli.MUOKKAAJA,
          email: ProjektiFixture.mattiMeikalainenProjektiKayttaja.email,
          kayttajatunnus: ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
          nimi: ProjektiFixture.mattiMeikalainenProjektiKayttaja.nimi,
          puhelinnumero: ProjektiFixture.mattiMeikalainenProjektiKayttaja.puhelinnumero || "",
          organisaatio: ProjektiFixture.mattiMeikalainenProjektiKayttaja.organisaatio,
        },
      ],
      oid: this.PROJEKTI1_OID,
      velho: {
        nimi: this.PROJEKTI1_NIMI,
        tyyppi: ProjektiTyyppi.TIE,
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
        kuulutusYhteystiedot: {
          yhteysTiedot: this.yhteystietoLista,
        },
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
  }

  dbProjekti2(): DBProjekti {
    return {
      kayttoOikeudet: [
        {
          rooli: ProjektiRooli.PROJEKTIPAALLIKKO,
          email: ProjektiFixture.pekkaProjariProjektiKayttaja.email,
          kayttajatunnus: ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
          nimi: ProjektiFixture.pekkaProjariProjektiKayttaja.nimi,
          puhelinnumero: ProjektiFixture.pekkaProjariProjektiKayttaja.puhelinnumero || "",
          organisaatio: ProjektiFixture.pekkaProjariProjektiKayttaja.organisaatio,
        },
        {
          rooli: ProjektiRooli.MUOKKAAJA,
          email: ProjektiFixture.mattiMeikalainenProjektiKayttaja.email,
          kayttajatunnus: ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
          nimi: ProjektiFixture.mattiMeikalainenProjektiKayttaja.nimi,
          puhelinnumero: ProjektiFixture.mattiMeikalainenProjektiKayttaja.puhelinnumero || "",
          organisaatio: ProjektiFixture.mattiMeikalainenProjektiKayttaja.organisaatio,
        },
      ],
      oid: this.PROJEKTI2_OID,
      velho: {
        nimi: this.PROJEKTI2_NIMI,
        tyyppi: ProjektiTyyppi.TIE,
        kunnat: ["Mikkeli", "Juva", "Savonlinna"],
        vaylamuoto: ["tie"],
        vastuuhenkilonEmail: ProjektiFixture.pekkaProjariProjektiKayttaja.email,
        maakunnat: ["Uusimaa", "Pirkanmaa"],
        suunnittelustaVastaavaViranomainen: Viranomainen.UUDENMAAN_ELY,
        asiatunnusVayla: "A" + this.PROJEKTI2_OID,
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
              aloituskuulutusPDFPath:
                "/aloituskuulutus/KUNGORELSE OM INLEDANDET AV PLANERINGEN Marikas testprojekt.pdf",
            },
          },
          kielitiedot: {
            projektinNimiVieraskielella: "Marikas testprojekt",
            toissijainenKieli: Kieli.RUOTSI,
            ensisijainenKieli: Kieli.SUOMI,
          },
          ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
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
            vaylamuoto: ["tie"],
            nimi: "Marikan testiprojekti",
            tyyppi: ProjektiTyyppi.YLEINEN,
            kunnat: ["Mikkeli", " Juva", " Savonlinna"],
            maakunnat: ["Uusimaa", "Pirkanmaa"],
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
      },
      nahtavillaoloVaihe: {
        id: 1,
        hankkeenKuvaus: {
          SUOMI: "Lorem Ipsum nahtavillaoloVaihe",
          SAAME: "Saameksi nahtavillaoloVaihe",
        },
        kuulutusPaiva: "2022-06-07",
        kuulutusVaihePaattyyPaiva: "2042-06-07",
        muistutusoikeusPaattyyPaiva: "2042-06-08",
        kuulutusYhteysHenkilot: [ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus],
        ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
        kuulutusYhteystiedot: this.yhteystietoLista,
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
      kasittelynTila: {
        hyvaksymispaatos: { paatoksenPvm: "2022-02-03", asianumero: "traficom-123" },
      },
      hyvaksymisPaatosVaihe: {
        id: 1,
        hallintoOikeus: HallintoOikeus.HAMEENLINNA,
        ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
        kuulutusYhteystiedot: this.yhteystietoLista,
        kuulutusPaiva: "2022-01-02",
        kuulutusVaihePaattyyPaiva: "2022-01-03",
        kuulutusYhteysHenkilot: [
          ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
          ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
        ],
      },
      salt: "foo",
      paivitetty: "2022-03-15T14:30:00.000Z",
    };
  }

  // Nahtavillaolovaihe julkinen
  dbProjekti3: DBProjekti = {
    kayttoOikeudet: [
      {
        rooli: ProjektiRooli.PROJEKTIPAALLIKKO,
        email: ProjektiFixture.pekkaProjariProjektiKayttaja.email,
        kayttajatunnus: ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
        nimi: ProjektiFixture.pekkaProjariProjektiKayttaja.nimi,
        puhelinnumero: ProjektiFixture.pekkaProjariProjektiKayttaja.puhelinnumero || "",
        organisaatio: ProjektiFixture.pekkaProjariProjektiKayttaja.organisaatio,
      },
      {
        rooli: ProjektiRooli.MUOKKAAJA,
        email: ProjektiFixture.mattiMeikalainenProjektiKayttaja.email,
        kayttajatunnus: ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
        nimi: ProjektiFixture.mattiMeikalainenProjektiKayttaja.nimi,
        puhelinnumero: ProjektiFixture.mattiMeikalainenProjektiKayttaja.puhelinnumero || "",
        organisaatio: ProjektiFixture.mattiMeikalainenProjektiKayttaja.organisaatio,
      },
    ],
    oid: this.PROJEKTI3_OID,
    velho: {
      nimi: this.PROJEKTI3_NIMI,
      tyyppi: ProjektiTyyppi.TIE,
      kunnat: ["Mikkeli", "Juva", "Savonlinna"],
      vaylamuoto: ["tie"],
      vastuuhenkilonEmail: ProjektiFixture.pekkaProjariProjektiKayttaja.email,
      maakunnat: ["Uusimaa", "Pirkanmaa"],
      suunnittelustaVastaavaViranomainen: Viranomainen.UUDENMAAN_ELY,
      asiatunnusVayla: "A" + this.PROJEKTI2_OID,
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
        ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
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
          vaylamuoto: ["tie"],
          nimi: "Marikan testiprojekti",
          tyyppi: ProjektiTyyppi.YLEINEN,
          kunnat: ["Mikkeli", " Juva", " Savonlinna"],
          maakunnat: ["Uusimaa", "Pirkanmaa"],
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
    },
    suunnitteluVaihe: {
      arvioSeuraavanVaiheenAlkamisesta: "Syksy 2024",
      hankkeenKuvaus: {
        RUOTSI: "svenska",
        SAAME: null,
        SUOMI:
          "Tavoitteena on nykyisen ja tulevan maankäytön liittäminen\nluontevasti Hämeenlinnanväylään, huomioida alueen melunsuojaus, parantaa henkilöautoliikenteen ja joukkoliikenteen\nsujuvuutta ja turvallisuutta sekä tehdä jalankulun ja pyöräilyn\nyhteydet sujuviksi ja turvallisiksi. Raskaan liikenteen sujuvuuden ja matka-ajan ennustettavuuden parantaminen on myös\nyksi tavoitteista.",
      },
      julkinen: true,
      suunnittelunEteneminenJaKesto:
        "Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
    },
    nahtavillaoloVaihe: {
      id: 1,
      hankkeenKuvaus: {
        SUOMI: "Lorem Ipsum nahtavillaoloVaihe",
        SAAME: "Saameksi nahtavillaoloVaihe",
      },
      kuulutusPaiva: "2022-06-07",
      kuulutusVaihePaattyyPaiva: "2022-06-07",
      muistutusoikeusPaattyyPaiva: "2022-06-08",
      kuulutusYhteysHenkilot: [
        ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
        ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
      ],
      ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
      kuulutusYhteystiedot: this.yhteystietoLista,
    },
    nahtavillaoloVaiheJulkaisut: [
      {
        hankkeenKuvaus: {
          RUOTSI:
            "Syftet med fasen är att på ett naturligt sätt koppla nuvarande och framtida markanvändning till Tavastehusvägen, att ta hänsyn till områdets bullerskydd, att förbättra flödet och säkerheten för passagerare och kollektivtrafik samt att göra gång- och cykelförbindelserna smidiga. och säker. Att förbättra flödet av tung trafik och förutsägbarheten i restid är också ett av målen.",
          SAAME: null,
          SUOMI:
            "Nähtävilläolovaiheen tavoitteena on nykyisen ja tulevan maankäytön liittäminen luontevasti Hämeenlinnanväylään, huomioida alueen melunsuojaus, parantaa henkilöautoliikenteen ja joukkoliikenteen sujuvuutta ja turvallisuutta sekä tehdä jalankulun ja pyöräilyn yhteydet sujuviksi ja turvallisiksi. Raskaan liikenteen sujuvuuden ja matka-ajan ennustettavuuden parantaminen on myös yksi tavoitteista.",
        },
        hyvaksyja: "A123",
        id: 2,
        ilmoituksenVastaanottajat: {
          kunnat: [
            {
              nimi: "Kerava",
              sahkoposti: "email@email.email",
              __typename: "KuntaVastaanottaja",
            },
          ],
          viranomaiset: [
            {
              nimi: IlmoitettavaViranomainen.VAYLAVIRASTO,
              sahkoposti: "kirjaamo@vayla.fi",
              __typename: "ViranomaisVastaanottaja",
            },
          ],
          __typename: "IlmoituksenVastaanottajat",
        },
        kielitiedot: {
          ensisijainenKieli: Kieli.RUOTSI,
          projektinNimiVieraskielella: "sv",
          toissijainenKieli: Kieli.SUOMI,
        },
        kuulutusPaiva: "2022-06-20T11:54",
        kuulutusVaihePaattyyPaiva: "2042-07-21T11:54",
        kuulutusYhteysHenkilot: ["A123", "A000111"],
        kuulutusYhteystiedot: [
          {
            etunimi: "Ulla",
            organisaatio: "Ramboll",
            puhelinnumero: "029123123",
            sahkoposti: "ulla.uusi@rambo.ll",
            sukunimi: "Uusi",
            titteli: "DI",
          },
        ],
        muistutusoikeusPaattyyPaiva: "2042-07-21T11:54",
        muokkaaja: "A000111",
        tila: NahtavillaoloVaiheTila.HYVAKSYTTY,
        velho: {
          kunnat: ["Kerava"],
          maakunnat: ["Uusimaa", "Pirkanmaa"],
          linkki: null,
          nimi: "Mt 140 parantaminen Kaskelantien kohdalla, tiesuunnitelma, Kerava",
          tyyppi: ProjektiTyyppi.TIE,
          vastuuhenkilonEmail: "hanna.reuterhorn@ely-keskus.fi",
          vaylamuoto: ["tie"],
        },
      },
    ],
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
    salt: "foo",
    paivitetty: "2022-03-15T14:30:00.000Z",
  };

  dbProjekti4(): DBProjekti {
    const projekti = cloneDeep(this.dbProjekti3);
    return {
      ...projekti,
      oid: this.PROJEKTI4_OID,
      velho: { ...projekti.velho, nimi: this.PROJEKTI4_NIMI },
      kasittelynTila: {
        hyvaksymispaatos: { paatoksenPvm: "2022-02-03", asianumero: "traficom-123" },
      },
      hyvaksymisPaatosVaiheJulkaisut: [
        {
          aineistoNahtavilla: [
            {
              dokumenttiOid: "11",
              jarjestys: 1,
              kategoriaId: "T1xx",
              nimi: "T113 TS Esite.txt",
              tiedosto: "/hyvaksymispaatos/1/T113 TS Esite.txt",
              tila: AineistoTila.VALMIS,
              tuotu: "***unittest***",
            },
          ],
          hallintoOikeus: HallintoOikeus.HAMEENLINNA,
          hyvaksyja: "A000112",
          hyvaksymisPaatos: [
            {
              dokumenttiOid: "12",
              jarjestys: 1,
              nimi: "TYHJÄ.txt",
              tiedosto: "/hyvaksymispaatos/1/paatos/TYHJÄ.txt",
              tila: AineistoTila.VALMIS,
              tuotu: "***unittest***",
            },
          ],
          hyvaksymisPaatosVaihePDFt: undefined,
          id: 1,
          ilmoituksenVastaanottajat: {
            __typename: "IlmoituksenVastaanottajat",
            kunnat: [
              {
                __typename: "KuntaVastaanottaja",
                lahetetty: "2022-03-11T14:54",
                nimi: "Mikkeli",
                sahkoposti: "mikkeli@mikke.li",
              },
              {
                __typename: "KuntaVastaanottaja",
                lahetetty: "2022-03-11T14:54",
                nimi: " Juva",
                sahkoposti: "juva@ju.va",
              },
              {
                __typename: "KuntaVastaanottaja",
                lahetetty: "2022-03-11T14:54",
                nimi: " Savonlinna",
                sahkoposti: "savonlinna@savonlin.na",
              },
            ],
            viranomaiset: [
              {
                __typename: "ViranomaisVastaanottaja",
                lahetetty: "2022-03-11T14:54",
                nimi: IlmoitettavaViranomainen.ETELA_SAVO_ELY,
                sahkoposti: "kirjaamo.etela-savo@ely-keskus.fi",
              },
            ],
          },
          kielitiedot: this.dbProjekti3.kielitiedot,
          kuulutusPaiva: "2022-06-09",
          kuulutusVaihePaattyyPaiva: "2100-01-01",
          kuulutusYhteysHenkilot: [ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus],
          kuulutusYhteystiedot: [
            {
              etunimi: "Etunimi",
              organisaatio: "",
              puhelinnumero: "0293121213",
              sahkoposti: "Etunimi.Sukunimi@vayla.fi",
              sukunimi: "Sukunimi",
              titteli: "Projektipäällikkö",
            },
            {
              etunimi: "Joku",
              organisaatio: "",
              puhelinnumero: "02998765",
              sahkoposti: "Joku.Jokunen@vayla.fi",
              sukunimi: "Jokunen",
              titteli: "Konsultti",
            },
          ],
          muokkaaja: "A000112",
          tila: HyvaksymisPaatosVaiheTila.HYVAKSYTTY,
          velho: {
            kunnat: ["Helsinki", " Vantaa"],
            linkki: null,
            maakunnat: ["Uusimaa"],
            nimi: "HASSU AUTOMAATTITESTIPROJEKTI1",
            suunnittelustaVastaavaViranomainen: Viranomainen.VAYLAVIRASTO,
            tyyppi: ProjektiTyyppi.TIE,
            vastuuhenkilonEmail: "mikko.haapamki@cgi.com",
            vaylamuoto: ["tie"],
          },
        },
      ],
    };
  }

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
    ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
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
        esitettavatYhteystiedot: this.yhteystietoLista2,
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
        esitettavatYhteystiedot: this.yhteystietoLista2,
      },
    ],
  };
}
