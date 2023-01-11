import {
  AineistoTila,
  AloitusKuulutusInput,
  HallintoOikeus,
  IlmoitettavaViranomainen,
  IlmoituksenVastaanottajat,
  KaytettavaPalvelu,
  KayttajaTyyppi,
  Kieli,
  KuulutusJulkaisuTila,
  Projekti,
  ProjektiKayttaja,
  ProjektiTyyppi,
  Status,
  TallennaProjektiInput,
  Viranomainen,
  VuorovaikutusKierrosTila,
  VuorovaikutusTilaisuusTyyppi,
  Yhteystieto,
} from "../../../common/graphql/apiModel";
import { DBProjekti, DBVaylaUser, VuorovaikutusKierros } from "../../src/database/model";
import cloneDeep from "lodash/cloneDeep";
import { kuntametadata } from "../../../common/kuntametadata";
import pick from "lodash/pick";

const mikkeli = kuntametadata.idForKuntaName("Mikkeli");
const juva = kuntametadata.idForKuntaName("Juva");
const savonlinna = kuntametadata.idForKuntaName("Savonlinna");
const kerava = kuntametadata.idForKuntaName("Kerava");

const mikkeliJuvaSavonlinna = [mikkeli, juva, savonlinna];
const uusimaaPirkanmaa = kuntametadata.idsForMaakuntaNames(["Uusimaa", "Pirkanmaa"]);

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
        id: mikkeli,
        __typename: "KuntaVastaanottaja",
      },
      {
        sahkoposti: "juva@ju.va",
        lahetetty: "2022-03-11T14:54",
        id: juva,
        __typename: "KuntaVastaanottaja",
      },
      {
        sahkoposti: "savonlinna@savonlin.na",
        lahetetty: "2022-03-11T14:54",
        id: savonlinna,
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
    tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
    muokattavissa: false,
    etunimi: "Pekka",
    sukunimi: "Projari",
    email: "pekka.projari@vayla.fi",
    organisaatio: "Väylävirasto",
    puhelinnumero: "123456789",
  };

  private static mattiMeikalainenProjektiKayttaja: ProjektiKayttaja = {
    __typename: "ProjektiKayttaja",
    kayttajatunnus: "A000111",
    muokattavissa: true,
    etunimi: "Matti",
    sukunimi: "Meikalainen",
    email: "Matti.Meikalainen@vayla.fi",
    organisaatio: "Väylävirasto",
    puhelinnumero: "123456789",
  };

  private static kunnanYhteysHenkiloProjektiKayttaja: ProjektiKayttaja = {
    __typename: "ProjektiKayttaja",
    kayttajatunnus: "A000123",
    muokattavissa: true,
    etunimi: "Kunta",
    sukunimi: "Kuntalainen",
    email: "Kunta.Kuntalainen@vayla.fi",
    organisaatio: "Nokia",
    puhelinnumero: "123456789",
  };

  tallennaProjektiInput: TallennaProjektiInput = {
    oid: this.PROJEKTI1_OID,
    versio: 1,
  };

  projekti1(): Projekti {
    return {
      __typename: "Projekti",
      oid: this.PROJEKTI1_OID,
      versio: 1,
      velho: {
        __typename: "Velho",
        nimi: this.PROJEKTI1_NIMI,
        tyyppi: ProjektiTyyppi.TIE,
        maakunnat: [kuntametadata.idForMaakuntaName("Uusimaa"), kuntametadata.idForMaakuntaName("Pirkanmaa")],
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
      vahainenMenettely: false,
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
      versio: 1,
      velho: {
        nimi: this.PROJEKTI1_NIMI,
        tyyppi: ProjektiTyyppi.TIE,
        vastuuhenkilonEmail: "pekka.projari@vayla.fi",
        asiatunnusELY: "Väylä/123/01.01.01/2023",
      },
      muistiinpano: this.PROJEKTI1_MUISTIINPANO_1,
      kayttoOikeudet: [
        {
          kayttajatunnus: "A123",
          tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
          muokattavissa: false,
          etunimi: "Pekka",
          sukunimi: "Projari",
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
    ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
    siirtyySuunnitteluVaiheeseen: "2999-01-01",
    kuulutusYhteystiedot: {
      yhteysTiedot: this.yhteystietoLista,
    },
  };

  dbProjekti1(): DBProjekti {
    return {
      kayttoOikeudet: [
        {
          tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
          ...pick(ProjektiFixture.pekkaProjariProjektiKayttaja, ["email", "kayttajatunnus", "etunimi", "sukunimi", "organisaatio"]),
          puhelinnumero: ProjektiFixture.pekkaProjariProjektiKayttaja.puhelinnumero || "",
          organisaatio: ProjektiFixture.pekkaProjariProjektiKayttaja.organisaatio || "",
        },
        this.mattiMeikalainenDBVaylaUser(),
        this.kunnanYhteysHenkiloDBVaylaUser(),
      ],
      oid: this.PROJEKTI1_OID,
      versio: 1,
      velho: {
        nimi: this.PROJEKTI1_NIMI,
        tyyppi: ProjektiTyyppi.TIE,
        suunnittelustaVastaavaViranomainen: Viranomainen.UUDENMAAN_ELY,
        kunnat: kuntametadata.idsForKuntaNames(["Tampere", "Nokia"]),
        maakunnat: kuntametadata.idsForMaakuntaNames(["Uusimaa", "Pirkanmaa"]),
        vaylamuoto: ["tie"],
        asiatunnusVayla: "VAYLA/" + this.PROJEKTI1_OID + "/2022",
        asiatunnusELY: "ELY/" + this.PROJEKTI1_OID + "/2022",
      },
      muistiinpano: this.PROJEKTI1_MUISTIINPANO_1,
      suunnitteluSopimus: {
        kunta: kuntametadata.idForKuntaName("Nokia"),
        yhteysHenkilo: ProjektiFixture.kunnanYhteysHenkiloProjektiKayttaja.kayttajatunnus,
        logo: "logo.gif",
      },
      aloitusKuulutus: {
        id: 1,
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
      vahainenMenettely: false,
      liittyvatSuunnitelmat: [
        {
          asiatunnus: "atunnus123",
          nimi: "Littyva suunnitelma 1 nimi",
        },
      ],
      paivitetty: "2022-03-15T13:00:00.000Z",
    };
  }

  mattiMeikalainenDBVaylaUser(): DBVaylaUser {
    return projektiKayttajaAsDBVaylaUser(ProjektiFixture.mattiMeikalainenProjektiKayttaja);
  }

  kunnanYhteysHenkiloDBVaylaUser(): DBVaylaUser {
    return projektiKayttajaAsDBVaylaUser(ProjektiFixture.kunnanYhteysHenkiloProjektiKayttaja);
  }

  dbProjekti2Velho() {
    return {
      nimi: this.PROJEKTI2_NIMI,
      tyyppi: ProjektiTyyppi.TIE,
      kunnat: mikkeliJuvaSavonlinna,
      vaylamuoto: ["tie"],
      vastuuhenkilonEmail: ProjektiFixture.pekkaProjariProjektiKayttaja.email,
      maakunnat: uusimaaPirkanmaa,
      suunnittelustaVastaavaViranomainen: Viranomainen.UUDENMAAN_ELY,
      asiatunnusVayla: "VAYLA/" + this.PROJEKTI2_OID + "/2022",
      asiatunnusELY: "ELY/" + this.PROJEKTI2_OID + "/2022",
    };
  }

  dbProjekti2(): DBProjekti {
    return {
      kayttoOikeudet: [
        {
          tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
          ...projektiKayttajaAsDBVaylaUser(ProjektiFixture.pekkaProjariProjektiKayttaja),
        },
        this.mattiMeikalainenDBVaylaUser(),
      ],
      oid: this.PROJEKTI2_OID,
      versio: 1,
      velho: this.dbProjekti2Velho(),
      aloitusKuulutusJulkaisut: [
        {
          aloituskuulutusPDFt: {
            SUOMI: {
              aloituskuulutusIlmoitusPDFPath:
                "/aloituskuulutus/ILMOITUS TOIMIVALTAISEN VIRANOMAISEN KUULUTUKSESTA Marikan testiprojekti.pdf",
              aloituskuulutusPDFPath: "/aloituskuulutus/KUULUTUS SUUNNITTELUN ALOITTAMISESTA Marikan testiprojekti.pdf",
            },
            RUOTSI: {
              aloituskuulutusIlmoitusPDFPath: "/aloituskuulutus/MEDDELANDE OM KUNGORELSE FRAN BEHORIG MYNDIGHET Marikas testprojekt.pdf",
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
            SAAME: undefined,
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
          velho: this.dbProjekti2Velho(),
          id: 1,
          tila: KuulutusJulkaisuTila.HYVAKSYTTY,
          siirtyySuunnitteluVaiheeseen: "2022-04-28T14:28",
        },
      ],
      aloitusKuulutus: {
        id: 1,
        hankkeenKuvaus: {
          SUOMI:
            "Suunnittelu kohde on osa Hyvinkää-Hanko sähköistyshanketta, jossa toteutetaan myös tasoristeysten toimenpiteitä. Hyväksytyssä ratasuunnitelmassa kyseisessä kohdassa on hyväksytty suunnitelmaratkaisuna Kisan seisakkeen ja Leksvallin tasoristeysten poistaminen parantamalla Helmströmin tasoristeyksen kohdalle uusi tasoristeys. Nyt käynnistetään Rata-suunnitelman päivitys kyseisessä kohdassa ja suunnitellaan kaikkien kolmen tasoristeyksen poistaminen uudella Leksvallin ylikulkusillalla.",
          RUOTSI:
            "Designplatsen är en del av elektrifieringsprojektet Hyvinge-Hangö, som också kommer att genomföra plankorsningsåtgärder. I den fastställda spårplanen är borttagandet av tävlingsstoppet och Leksvallskorsningen genom förbättring av en ny plankorsning vid Helmströms plankorsning vid denna punkt godkänd som planlösning. En uppdatering av Spårplanen kommer nu att lanseras då och man planerar att ta bort alla tre plankorsningarna på den nya Leksvallsöverfarten.",
          SAAME: undefined,
        },
        ilmoituksenVastaanottajat: {
          kunnat: [
            {
              id: mikkeli,
              sahkoposti: "mikkeli@mikke.li",
            },
            {
              id: juva,
              sahkoposti: "juva@ju.va",
            },
            {
              id: savonlinna,
              sahkoposti: "savonlinna@savonlin.na",
            },
          ],
          viranomaiset: [
            {
              nimi: IlmoitettavaViranomainen.ETELA_SAVO_ELY,
              sahkoposti: "kirjaamo.etela-savo@ely-keskus.fi",
            },
          ],
        },
        kuulutusPaiva: "2022-03-28T14:28",
        siirtyySuunnitteluVaiheeseen: "2022-04-28T14:28",
        kuulutusYhteystiedot: {
          yhteysTiedot: [
            {
              etunimi: "Marko",
              sukunimi: "Koi",
              sahkoposti: "markku.koi@koi.com",
              organisaatio: "Kajaani",
              puhelinnumero: "0293121213",
            },
          ],
          yhteysHenkilot: [
            ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
            ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
          ],
        },
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
        ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
        kuulutusYhteystiedot: {
          yhteysTiedot: this.yhteystietoLista,
          yhteysHenkilot: [ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus],
        },
      },
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.RUOTSI,
        projektinNimiVieraskielella: "Namnet på svenska",
      },
      euRahoitus: false,
      vahainenMenettely: false,
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
        kuulutusYhteystiedot: {
          yhteysTiedot: this.yhteystietoLista,
          yhteysHenkilot: [
            ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
            ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
          ],
        },
        kuulutusPaiva: "2022-01-02",
        kuulutusVaihePaattyyPaiva: "2022-01-03",
      },
      salt: "foo",
      paivitetty: "2022-03-15T14:30:00.000Z",
      tallennettu: true,
    };
  }

  // Nahtavillaolovaihe julkinen
  dbProjekti3: DBProjekti = {
    kayttoOikeudet: [
      {
        tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
        muokattavissa: false,
        ...projektiKayttajaAsDBVaylaUser(ProjektiFixture.pekkaProjariProjektiKayttaja),
      },
      this.mattiMeikalainenDBVaylaUser(),
    ],
    oid: this.PROJEKTI3_OID,
    versio: 1,
    velho: {
      nimi: this.PROJEKTI3_NIMI,
      tyyppi: ProjektiTyyppi.TIE,
      kunnat: mikkeliJuvaSavonlinna,
      vaylamuoto: ["tie"],
      vastuuhenkilonEmail: ProjektiFixture.pekkaProjariProjektiKayttaja.email,
      maakunnat: uusimaaPirkanmaa,
      suunnittelustaVastaavaViranomainen: Viranomainen.UUDENMAAN_ELY,
      asiatunnusVayla: "VAYLA/" + this.PROJEKTI3_OID + "/2022",
      asiatunnusELY: "ELY/" + this.PROJEKTI3_OID + "/2022",
    },
    aloitusKuulutusJulkaisut: [
      {
        aloituskuulutusPDFt: {
          SUOMI: {
            aloituskuulutusIlmoitusPDFPath: "/aloituskuulutus/ILMOITUS TOIMIVALTAISEN VIRANOMAISEN KUULUTUKSESTA Marikan testiprojekti.pdf",
            aloituskuulutusPDFPath: "/aloituskuulutus/KUULUTUS SUUNNITTELUN ALOITTAMISESTA Marikan testiprojekti.pdf",
          },
          RUOTSI: {
            aloituskuulutusIlmoitusPDFPath: "/aloituskuulutus/MEDDELANDE OM KUNGORELSE FRAN BEHORIG MYNDIGHET Marikas testprojekt.pdf",
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
        hyvaksymisPaiva: "2022-03-21",
        hankkeenKuvaus: {
          SUOMI:
            "Suunnittelu kohde on osa Hyvinkää-Hanko sähköistyshanketta, jossa toteutetaan myös tasoristeysten toimenpiteitä. Hyväksytyssä ratasuunnitelmassa kyseisessä kohdassa on hyväksytty suunnitelmaratkaisuna Kisan seisakkeen ja Leksvallin tasoristeysten poistaminen parantamalla Helmströmin tasoristeyksen kohdalle uusi tasoristeys. Nyt käynnistetään Rata-suunnitelman päivitys kyseisessä kohdassa ja suunnitellaan kaikkien kolmen tasoristeyksen poistaminen uudella Leksvallin ylikulkusillalla.",
          RUOTSI:
            "Designplatsen är en del av elektrifieringsprojektet Hyvinge-Hangö, som också kommer att genomföra plankorsningsåtgärder. I den fastställda spårplanen är borttagandet av tävlingsstoppet och Leksvallskorsningen genom förbättring av en ny plankorsning vid Helmströms plankorsning vid denna punkt godkänd som planlösning. En uppdatering av Spårplanen kommer nu att lanseras då och man planerar att ta bort alla tre plankorsningarna på den nya Leksvallsöverfarten.",
          SAAME: undefined,
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
          kunnat: mikkeliJuvaSavonlinna,
          maakunnat: uusimaaPirkanmaa,
        },
        id: 1,
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        siirtyySuunnitteluVaiheeseen: "2022-04-28T14:28",
      },
    ],
    aloitusKuulutus: {
      id: 1,
      hankkeenKuvaus: {
        SUOMI:
          "Suunnittelu kohde on osa Hyvinkää-Hanko sähköistyshanketta, jossa toteutetaan myös tasoristeysten toimenpiteitä. Hyväksytyssä ratasuunnitelmassa kyseisessä kohdassa on hyväksytty suunnitelmaratkaisuna Kisan seisakkeen ja Leksvallin tasoristeysten poistaminen parantamalla Helmströmin tasoristeyksen kohdalle uusi tasoristeys. Nyt käynnistetään Rata-suunnitelman päivitys kyseisessä kohdassa ja suunnitellaan kaikkien kolmen tasoristeyksen poistaminen uudella Leksvallin ylikulkusillalla.",
        RUOTSI:
          "Designplatsen är en del av elektrifieringsprojektet Hyvinge-Hangö, som också kommer att genomföra plankorsningsåtgärder. I den fastställda spårplanen är borttagandet av tävlingsstoppet och Leksvallskorsningen genom förbättring av en ny plankorsning vid Helmströms plankorsning vid denna punkt godkänd som planlösning. En uppdatering av Spårplanen kommer nu att lanseras då och man planerar att ta bort alla tre plankorsningarna på den nya Leksvallsöverfarten.",
        SAAME: undefined,
      },
      ilmoituksenVastaanottajat: {
        kunnat: [
          {
            id: mikkeli,
            sahkoposti: "mikkeli@mikke.li",
          },
          {
            id: juva,
            sahkoposti: "juva@ju.va",
          },
          {
            id: savonlinna,
            sahkoposti: "savonlinna@savonlin.na",
          },
        ],
        viranomaiset: [
          {
            nimi: IlmoitettavaViranomainen.ETELA_SAVO_ELY,
            sahkoposti: "kirjaamo.etela-savo@ely-keskus.fi",
          },
        ],
      },
      kuulutusPaiva: "2022-03-28T14:28",
      siirtyySuunnitteluVaiheeseen: "2022-04-28T14:28",
    },
    vuorovaikutusKierros: {
      vuorovaikutusNumero: 0,
      vuorovaikutusJulkaisuPaiva: "2022-04-28T14:28",
      arvioSeuraavanVaiheenAlkamisesta: "Syksy 2024",
      hankkeenKuvaus: {
        RUOTSI: "svenska",
        SAAME: undefined,
        SUOMI:
          "Tavoitteena on nykyisen ja tulevan maankäytön liittäminen\nluontevasti Hämeenlinnanväylään, huomioida alueen melunsuojaus, parantaa henkilöautoliikenteen ja joukkoliikenteen\nsujuvuutta ja turvallisuutta sekä tehdä jalankulun ja pyöräilyn\nyhteydet sujuviksi ja turvallisiksi. Raskaan liikenteen sujuvuuden ja matka-ajan ennustettavuuden parantaminen on myös\nyksi tavoitteista.",
      },
      tila: VuorovaikutusKierrosTila.JULKINEN,
      suunnittelunEteneminenJaKesto:
        "Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
      ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
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
      ],
      esitettavatYhteystiedot: {
        yhteysTiedot: [],
        yhteysHenkilot: ["A000111"],
      },
    },
    vuorovaikutusKierrosJulkaisut: [
      {
        id: 0,
        vuorovaikutusJulkaisuPaiva: "2022-04-28T14:28",
        arvioSeuraavanVaiheenAlkamisesta: "Syksy 2024",
        hankkeenKuvaus: {
          RUOTSI: "svenska",
          SAAME: undefined,
          SUOMI:
            "Tavoitteena on nykyisen ja tulevan maankäytön liittäminen\nluontevasti Hämeenlinnanväylään, huomioida alueen melunsuojaus, parantaa henkilöautoliikenteen ja joukkoliikenteen\nsujuvuutta ja turvallisuutta sekä tehdä jalankulun ja pyöräilyn\nyhteydet sujuviksi ja turvallisiksi. Raskaan liikenteen sujuvuuden ja matka-ajan ennustettavuuden parantaminen on myös\nyksi tavoitteista.",
        },
        tila: VuorovaikutusKierrosTila.JULKINEN,
        ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
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
        ],
        yhteystiedot: [
          {
            etunimi: "Matti",
            sukunimi: "Meikalainen",
            sahkoposti: "Matti.Meikalainen@vayla.fi",
            organisaatio: "Väylävirasto",
            puhelinnumero: "123456789",
          },
        ],
        vuorovaikutusPDFt: {
          [Kieli.SUOMI]: {
            kutsuPDFPath: "1.pdf",
          },
          [Kieli.RUOTSI]: {
            kutsuPDFPath: "2.pdf",
          },
        },
        suunnittelunEteneminenJaKesto:
          "Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
      },
    ],
    nahtavillaoloVaihe: {
      id: 1,
      hankkeenKuvaus: {
        SUOMI: "Lorem Ipsum nahtavillaoloVaihe",
        SAAME: "Saameksi nahtavillaoloVaihe",
      },
      kuulutusPaiva: "2022-06-07",
      kuulutusVaihePaattyyPaiva: "2022-06-07",
      muistutusoikeusPaattyyPaiva: "2022-06-08",
      ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
      kuulutusYhteystiedot: {
        yhteysTiedot: this.yhteystietoLista,
        yhteysHenkilot: [
          ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
          ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
        ],
      },
    },
    nahtavillaoloVaiheJulkaisut: [
      {
        aineistoNahtavilla: [],
        hankkeenKuvaus: {
          RUOTSI:
            "Syftet med fasen är att på ett naturligt sätt koppla nuvarande och framtida markanvändning till Tavastehusvägen, att ta hänsyn till områdets bullerskydd, att förbättra flödet och säkerheten för passagerare och kollektivtrafik samt att göra gång- och cykelförbindelserna smidiga. och säker. Att förbättra flödet av tung trafik och förutsägbarheten i restid är också ett av målen.",
          SAAME: undefined,
          SUOMI:
            "Nähtävilläolovaiheen tavoitteena on nykyisen ja tulevan maankäytön liittäminen luontevasti Hämeenlinnanväylään, huomioida alueen melunsuojaus, parantaa henkilöautoliikenteen ja joukkoliikenteen sujuvuutta ja turvallisuutta sekä tehdä jalankulun ja pyöräilyn yhteydet sujuviksi ja turvallisiksi. Raskaan liikenteen sujuvuuden ja matka-ajan ennustettavuuden parantaminen on myös yksi tavoitteista.",
        },
        hyvaksyja: "A123",
        id: 2,
        ilmoituksenVastaanottajat: {
          kunnat: [
            {
              id: kerava,
              sahkoposti: "email@email.email",
            },
          ],
          viranomaiset: [
            {
              nimi: IlmoitettavaViranomainen.VAYLAVIRASTO,
              sahkoposti: "kirjaamo@vayla.fi",
            },
          ],
        },
        kielitiedot: {
          ensisijainenKieli: Kieli.RUOTSI,
          projektinNimiVieraskielella: "sv",
          toissijainenKieli: Kieli.SUOMI,
        },
        kuulutusPaiva: "2022-06-20T11:54",
        kuulutusVaihePaattyyPaiva: "2042-07-21T11:54",
        yhteystiedot: [
          {
            etunimi: "Ulla",
            organisaatio: "Ramboll",
            puhelinnumero: "029123123",
            sahkoposti: "ulla.uusi@rambo.ll",
            sukunimi: "Uusi",
            titteli: "DI",
          },
          {
            etunimi: "Pekka",
            organisaatio: "Väylävirasto",
            puhelinnumero: "123456789",
            sukunimi: "Pojari",
            sahkoposti: "pekka.projari@vayla.fi",
          },
          {
            etunimi: "Matti",
            organisaatio: "Väylävirasto",
            puhelinnumero: "123456789",
            sahkoposti: "Matti.Meikalainen@vayla.fi",
            sukunimi: "Meikäläinen",
          },
        ],
        muistutusoikeusPaattyyPaiva: "2042-07-21T11:54",
        muokkaaja: "A000111",
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        velho: {
          kunnat: [kerava],
          maakunnat: uusimaaPirkanmaa,
          linkki: null,
          nimi: "Mt 140 parantaminen Kaskelantien kohdalla, tiesuunnitelma, Kerava",
          tyyppi: ProjektiTyyppi.TIE,
          vastuuhenkilonEmail: "hanna.reuterhorn@ely-keskus.fi",
          vaylamuoto: ["tie"],
        },
        nahtavillaoloPDFt: {
          SUOMI: {
            nahtavillaoloIlmoitusPDFPath: "1.pdf",
            nahtavillaoloPDFPath: "2.pdf",
            nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath: "3.pdf",
          },
        },
      },
    ],
    kielitiedot: {
      ensisijainenKieli: Kieli.SUOMI,
      toissijainenKieli: Kieli.RUOTSI,
      projektinNimiVieraskielella: "Namnet på svenska",
    },
    euRahoitus: false,
    vahainenMenettely: false,
    liittyvatSuunnitelmat: [
      {
        asiatunnus: "atunnus123",
        nimi: "Littyva suunnitelma 1 nimi",
      },
    ],
    salt: "foo",
    paivitetty: "2022-03-15T14:30:00.000Z",
    tallennettu: true,
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
              kategoriaId: "osa_a",
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
          hyvaksymisPaatosVaihePDFt: {
            SUOMI: {
              hyvaksymisIlmoitusLausunnonantajillePDFPath: "1.pdf",
              hyvaksymisIlmoitusMuistuttajillePDFPath: "2.pdf",
              ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath: "3.pdf",
              hyvaksymisKuulutusPDFPath: "4.pdf",
              ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath: "5.pdf",
            },
          },
          id: 1,
          ilmoituksenVastaanottajat: {
            kunnat: [
              {
                lahetetty: "2022-03-11T14:54",
                id: mikkeli,
                sahkoposti: "mikkeli@mikke.li",
              },
              {
                lahetetty: "2022-03-11T14:54",
                id: juva,
                sahkoposti: "juva@ju.va",
              },
              {
                lahetetty: "2022-03-11T14:54",
                id: savonlinna,
                sahkoposti: "savonlinna@savonlin.na",
              },
            ],
            viranomaiset: [
              {
                lahetetty: "2022-03-11T14:54",
                nimi: IlmoitettavaViranomainen.ETELA_SAVO_ELY,
                sahkoposti: "kirjaamo.etela-savo@ely-keskus.fi",
              },
            ],
          },
          // kielitiedot on ihan oikein
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          kielitiedot: this.dbProjekti3.kielitiedot,
          kuulutusPaiva: "2022-06-09",
          kuulutusVaihePaattyyPaiva: "2100-01-01",
          kuulutusYhteysHenkilot: [ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus],
          yhteystiedot: [
            {
              etunimi: "Pekka",
              organisaatio: ProjektiFixture.pekkaProjariProjektiKayttaja.organisaatio || "",
              sahkoposti: ProjektiFixture.pekkaProjariProjektiKayttaja.email,
              puhelinnumero: ProjektiFixture.pekkaProjariProjektiKayttaja.puhelinnumero || "",
              sukunimi: "Projari",
            },
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
          tila: KuulutusJulkaisuTila.HYVAKSYTTY,
          velho: {
            kunnat: kuntametadata.idsForKuntaNames(["Helsinki", " Vantaa"]),
            linkki: null,
            maakunnat: kuntametadata.idsForMaakuntaNames(["Uusimaa"]),
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

  vuorovaikutus: VuorovaikutusKierros = {
    vuorovaikutusNumero: 0,
    julkinen: true,
    hankkeenKuvaus: this.hankkeenKuvausSuunnitteluVaiheessa,
    vuorovaikutusJulkaisuPaiva: "2022-03-23",
    videot: [{ nimi: "Esittely", url: "https://video" }],
    kysymyksetJaPalautteetViimeistaan: "2022-03-23T23:48",
    esittelyaineistot: [],
    suunnitelmaluonnokset: [],
    esitettavatYhteystiedot: {
      yhteysTiedot: [
        {
          etunimi: "Marko",
          sukunimi: "Koi",
          sahkoposti: "markku.koi@koi.com",
          organisaatio: "Kajaani",
          puhelinnumero: "0293121213",
        },
      ],
      yhteysHenkilot: [
        ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
        ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
      ],
    },
    ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
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
        esitettavatYhteystiedot: {
          // yhteystietoLista2 on ihan oikein
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          yhteysTiedot: this.yhteystietoLista2,
          yhteysHenkilot: [
            ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
            ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
          ],
        },
      },
      {
        tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
        nimi: "Toisen soittoaikatilaisuuden nimi tässä",
        paivamaara: "2033-04-05",
        alkamisAika: "12:00",
        paattymisAika: "13:00",
        esitettavatYhteystiedot: {
          // yhteystietoLista2 on ihan oikein
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          yhteysTiedot: this.yhteystietoLista2,
        },
      },
    ],
  };
}

function projektiKayttajaAsDBVaylaUser(kayttaja: ProjektiKayttaja): DBVaylaUser {
  return {
    email: kayttaja.email,
    kayttajatunnus: kayttaja.kayttajatunnus,
    etunimi: kayttaja.etunimi,
    sukunimi: kayttaja.sukunimi,
    puhelinnumero: kayttaja.puhelinnumero || "",
    organisaatio: kayttaja.organisaatio || "",
  };
}
