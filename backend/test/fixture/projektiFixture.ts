import {
  AineistoTila,
  AloitusKuulutusInput,
  ELY,
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
  SuunnittelustaVastaavaViranomainen,
  TallennaProjektiInput,
  VuorovaikutusKierrosTila,
  VuorovaikutusTilaisuusTyyppi,
  Yhteystieto,
} from "../../../common/graphql/apiModel";
import { AloitusKuulutusJulkaisu, DBProjekti, DBVaylaUser, Velho, VuorovaikutusKierros } from "../../src/database/model";
import cloneDeep from "lodash/cloneDeep";
import { kuntametadata } from "../../../common/kuntametadata";
import pick from "lodash/pick";
import dayjs from "dayjs";
import { assertIsDefined } from "../../src/util/assertions";

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
  public PROJEKTI5_OID = "5";

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

  private static elyProjektiKayttaja: ProjektiKayttaja = {
    __typename: "ProjektiKayttaja",
    kayttajatunnus: "A000124",
    muokattavissa: true,
    etunimi: "Eemil",
    sukunimi: "Elylainen",
    email: "eemil.elylainen@ely.fi",
    elyOrganisaatio: ELY.PIRKANMAAN_ELY,
    organisaatio: "ELY",
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
        asiatunnusELY: "ELY/123/01.01.01/2023",
        suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.ETELA_POHJANMAAN_ELY,
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
    hankkeenKuvaus: { SUOMI: "Lorem Ipsum", RUOTSI: "På Svenska" },
    ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
    siirtyySuunnitteluVaiheeseen: "2999-01-01",
    kuulutusYhteystiedot: {
      yhteysTiedot: this.yhteystietoLista,
      yhteysHenkilot: [this.elyYhteysHenkiloDBVaylaUser().kayttajatunnus],
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
        this.elyYhteysHenkiloDBVaylaUser(),
      ],
      oid: this.PROJEKTI1_OID,
      versio: 1,
      velho: {
        nimi: this.PROJEKTI1_NIMI,
        tyyppi: ProjektiTyyppi.TIE,
        suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
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
        logo: "/suunnittelusopimus/logo.png",
      },
      aloitusKuulutus: {
        id: 1,
        kuulutusPaiva: "2022-01-02",
        hankkeenKuvaus: {
          SUOMI: "Lorem Ipsum",
          RUOTSI: "På svenska",
        },
        siirtyySuunnitteluVaiheeseen: "2022-01-01",
        kuulutusYhteystiedot: {
          yhteysTiedot: this.yhteystietoLista,
          yhteysHenkilot: [this.elyYhteysHenkiloDBVaylaUser().kayttajatunnus],
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

  elyYhteysHenkiloDBVaylaUser(): DBVaylaUser {
    return projektiKayttajaAsDBVaylaUser(ProjektiFixture.elyProjektiKayttaja);
  }

  dbProjekti2Velho(): Velho {
    return {
      nimi: this.PROJEKTI2_NIMI,
      tyyppi: ProjektiTyyppi.TIE,
      kunnat: mikkeliJuvaSavonlinna,
      vaylamuoto: ["tie"],
      vastuuhenkilonEmail: ProjektiFixture.pekkaProjariProjektiKayttaja.email,
      maakunnat: uusimaaPirkanmaa,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
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

  dbProjekti2UseammallaKuulutuksella(isoDate: string): DBProjekti {
    const projekti = this.dbProjekti2();

    const generateKuulutusPaiva = (daysToAdd = 0) => dayjs().add(daysToAdd, "day").format("YYYY-MM-DD");

    const julkaisuPohja = projekti.aloitusKuulutusJulkaisut?.[0];
    assertIsDefined(julkaisuPohja);

    const hyvaksyttyjenKuulutuksienPaivat = [-10, -4, -3, 0, 4, 6].map((daysToAdd) => generateKuulutusPaiva(daysToAdd));

    const hyvaksytytJulkaisut: DBProjekti["aloitusKuulutusJulkaisut"] = hyvaksyttyjenKuulutuksienPaivat.map((kuulutusPaiva) => {
      return { ...julkaisuPohja, kuulutusPaiva, tila: KuulutusJulkaisuTila.HYVAKSYTTY };
    });

    const hyvaksyttavaJulkaisu: AloitusKuulutusJulkaisu = {
      ...julkaisuPohja,
      tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
      kuulutusPaiva: isoDate,
    };

    return { ...projekti, aloitusKuulutusJulkaisut: [...hyvaksytytJulkaisut, hyvaksyttavaJulkaisu] };
  }

  dbProjekti5(): DBProjekti {
    const { aloitusKuulutusJulkaisut, ...projekti } = this.dbProjekti2();
    return {
      ...projekti,
      oid: this.PROJEKTI5_OID,
      aloitusKuulutusJulkaisut: aloitusKuulutusJulkaisut?.map<AloitusKuulutusJulkaisu>((julkaisu) => ({
        ...julkaisu,
        tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
      })),
    };
  }

  // NAHTAVILLAOLO_AINEISTOT tilainen projekti
  dbProjektiLackingNahtavillaoloVaihe(): DBProjekti {
    return {
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
        suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
        asiatunnusVayla: "VAYLA/" + this.PROJEKTI3_OID + "/2022",
        asiatunnusELY: "ELY/" + this.PROJEKTI3_OID + "/2022",
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
        arvioSeuraavanVaiheenAlkamisesta: {
          SUOMI: "Syksy 2024",
          RUOTSI: "Höst 2024",
        },
        hankkeenKuvaus: {
          RUOTSI: "svenska",
          SUOMI:
            "Tavoitteena on nykyisen ja tulevan maankäytön liittäminen\nluontevasti Hämeenlinnanväylään, huomioida alueen melunsuojaus, parantaa henkilöautoliikenteen ja joukkoliikenteen\nsujuvuutta ja turvallisuutta sekä tehdä jalankulun ja pyöräilyn\nyhteydet sujuviksi ja turvallisiksi. Raskaan liikenteen sujuvuuden ja matka-ajan ennustettavuuden parantaminen on myös\nyksi tavoitteista.",
        },
        tila: VuorovaikutusKierrosTila.JULKINEN,
        suunnittelunEteneminenJaKesto: {
          SUOMI:
            "Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
          RUOTSI:
            "RUOTSIKSI Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
        },
        ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
        vuorovaikutusTilaisuudet: [
          {
            tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
            nimi: {
              SUOMI: "Lorem ipsum",
              RUOTSI: "RUOTSIKSI Lorem ipsum",
            },
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
          arvioSeuraavanVaiheenAlkamisesta: {
            SUOMI: "Syksy 2024",
            RUOTSI: "Höst 2024",
          },
          hankkeenKuvaus: {
            RUOTSI: "svenska",
            SUOMI:
              "Tavoitteena on nykyisen ja tulevan maankäytön liittäminen\nluontevasti Hämeenlinnanväylään, huomioida alueen melunsuojaus, parantaa henkilöautoliikenteen ja joukkoliikenteen\nsujuvuutta ja turvallisuutta sekä tehdä jalankulun ja pyöräilyn\nyhteydet sujuviksi ja turvallisiksi. Raskaan liikenteen sujuvuuden ja matka-ajan ennustettavuuden parantaminen on myös\nyksi tavoitteista.",
          },
          tila: VuorovaikutusKierrosTila.JULKINEN,
          ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
          vuorovaikutusTilaisuudet: [
            {
              tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
              nimi: {
                SUOMI: "Lorem ipsum",
                RUOTSI: "RUOTSIKSI Lorem ipsum",
              },
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
          suunnittelunEteneminenJaKesto: {
            SUOMI:
              "Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
            RUOTSI:
              "RUOTSIKSI Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
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
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
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
      arvioSeuraavanVaiheenAlkamisesta: {
        SUOMI: "Syksy 2024",
        RUOTSI: "Höst 2024",
      },
      hankkeenKuvaus: {
        RUOTSI: "svenska",
        SUOMI:
          "Tavoitteena on nykyisen ja tulevan maankäytön liittäminen\nluontevasti Hämeenlinnanväylään, huomioida alueen melunsuojaus, parantaa henkilöautoliikenteen ja joukkoliikenteen\nsujuvuutta ja turvallisuutta sekä tehdä jalankulun ja pyöräilyn\nyhteydet sujuviksi ja turvallisiksi. Raskaan liikenteen sujuvuuden ja matka-ajan ennustettavuuden parantaminen on myös\nyksi tavoitteista.",
      },
      tila: VuorovaikutusKierrosTila.JULKINEN,
      suunnittelunEteneminenJaKesto: {
        SUOMI:
          "Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
        RUOTSI:
          "RUOTSIKSI Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
      },
      ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
      vuorovaikutusTilaisuudet: [
        {
          tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
          nimi: {
            SUOMI: "Lorem ipsum",
            RUOTSI: "RUOTSIKSI Lorem ipsum",
          },
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
        arvioSeuraavanVaiheenAlkamisesta: {
          SUOMI: "Syksy 2024",
          RUOTSI: "Höst 2024",
        },
        hankkeenKuvaus: {
          RUOTSI: "svenska",
          SUOMI:
            "Tavoitteena on nykyisen ja tulevan maankäytön liittäminen\nluontevasti Hämeenlinnanväylään, huomioida alueen melunsuojaus, parantaa henkilöautoliikenteen ja joukkoliikenteen\nsujuvuutta ja turvallisuutta sekä tehdä jalankulun ja pyöräilyn\nyhteydet sujuviksi ja turvallisiksi. Raskaan liikenteen sujuvuuden ja matka-ajan ennustettavuuden parantaminen on myös\nyksi tavoitteista.",
        },
        tila: VuorovaikutusKierrosTila.JULKINEN,
        ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
        vuorovaikutusTilaisuudet: [
          {
            tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
            nimi: {
              SUOMI: "Lorem ipsum",
              RUOTSI: "RUOTSIKSI Lorem ipsum",
            },
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
        suunnittelunEteneminenJaKesto: {
          SUOMI:
            "Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
          RUOTSI:
            "RUOTSIKSI Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
        },
      },
    ],
    nahtavillaoloVaihe: {
      id: 1,
      hankkeenKuvaus: {
        SUOMI: "Lorem Ipsum nahtavillaoloVaihe",
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

  dbProjektiHyvaksymisMenettelyssa(): DBProjekti {
    return {
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
        suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
        asiatunnusVayla: "VAYLA/" + this.PROJEKTI3_OID + "/2022",
        asiatunnusELY: "ELY/" + this.PROJEKTI3_OID + "/2022",
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
        arvioSeuraavanVaiheenAlkamisesta: {
          SUOMI: "Syksy 2024",
          RUOTSI: "Höst 2024",
        },
        hankkeenKuvaus: {
          RUOTSI: "svenska",
          SUOMI:
            "Tavoitteena on nykyisen ja tulevan maankäytön liittäminen\nluontevasti Hämeenlinnanväylään, huomioida alueen melunsuojaus, parantaa henkilöautoliikenteen ja joukkoliikenteen\nsujuvuutta ja turvallisuutta sekä tehdä jalankulun ja pyöräilyn\nyhteydet sujuviksi ja turvallisiksi. Raskaan liikenteen sujuvuuden ja matka-ajan ennustettavuuden parantaminen on myös\nyksi tavoitteista.",
        },
        tila: VuorovaikutusKierrosTila.JULKINEN,
        suunnittelunEteneminenJaKesto: {
          SUOMI:
            "Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
          RUOTSI:
            "RUOTSIKSI Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
        },
        ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
        vuorovaikutusTilaisuudet: [
          {
            tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
            nimi: {
              SUOMI: "Lorem ipsum",
              RUOTSI: "RUOTSIKSI Lorem ipsum",
            },
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
          arvioSeuraavanVaiheenAlkamisesta: {
            SUOMI: "Syksy 2024",
            RUOTSI: "Höst 2024",
          },
          hankkeenKuvaus: {
            RUOTSI: "svenska",
            SUOMI:
              "Tavoitteena on nykyisen ja tulevan maankäytön liittäminen\nluontevasti Hämeenlinnanväylään, huomioida alueen melunsuojaus, parantaa henkilöautoliikenteen ja joukkoliikenteen\nsujuvuutta ja turvallisuutta sekä tehdä jalankulun ja pyöräilyn\nyhteydet sujuviksi ja turvallisiksi. Raskaan liikenteen sujuvuuden ja matka-ajan ennustettavuuden parantaminen on myös\nyksi tavoitteista.",
          },
          tila: VuorovaikutusKierrosTila.JULKINEN,
          ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
          vuorovaikutusTilaisuudet: [
            {
              tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
              nimi: {
                SUOMI: "Lorem ipsum",
                RUOTSI: "RUOTSIKSI Lorem ipsum",
              },
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
          suunnittelunEteneminenJaKesto: {
            SUOMI:
              "Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
            RUOTSI:
              "RUOTSIKSI Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
          },
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
        hankkeenKuvaus: {
          SUOMI: "Lorem Ipsum nahtavillaoloVaihe",
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
          kuulutusVaihePaattyyPaiva: "2022-07-21T11:54",
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
  }

  dbProjektiKaikkiVaiheetSaame(): DBProjekti {
    const saameProjekti = this.dbProjektiHyvaksymisMenettelyssaSaame();
    assertIsDefined(saameProjekti.kielitiedot);
    assertIsDefined(saameProjekti.velho);
    const hyvaksymisPaatosVaihe = {
      aineistoNahtavilla: [
        {
          dokumenttiOid: "1.2.246.578.5.100.2147637429.4251089044",
          jarjestys: 1,
          kategoriaId: "osa_a",
          nimi: "TYHJÄ.txt",
          tiedosto: "/hyvaksymispaatos/1/TYHJÄ.txt",
          tila: AineistoTila.VALMIS,
          tuotu: "2020-01-01T00:00:00+02:00",
        },
      ],
      hallintoOikeus: HallintoOikeus.HAMEENLINNA,
      hyvaksymisPaatos: [
        {
          dokumenttiOid: "1.2.246.578.5.100.2147637429.4251089044",
          jarjestys: 1,
          nimi: "TYHJÄ.txt",
          tiedosto: "/hyvaksymispaatos/1/paatos/TYHJÄ.txt",
          tila: AineistoTila.VALMIS,
          tuotu: "2020-01-01T00:00:00+02:00",
        },
      ],
      id: 1,
      ilmoituksenVastaanottajat: {
        kunnat: [
          {
            id: 91,
            sahkoposti: "",
          },
          {
            id: 92,
            sahkoposti: "",
          },
        ],
        viranomaiset: [
          {
            lahetetty: "2020-01-01T00:00:00+02:00",
            nimi: IlmoitettavaViranomainen.ETELA_SAVO_ELY,
            sahkoposti: "kirjaamo.etela-savo@ely-keskus.fi",
          },
        ],
      },
      kuulutusPaiva: "2022-06-09",
      kuulutusVaihePaattyyPaiva: "2020-01-01T00:00:00+02:00",
      kuulutusYhteystiedot: {
        yhteysHenkilot: ["A000112"],
        yhteysTiedot: [
          {
            etunimi: "Etunimi",
            puhelinnumero: "0293121213",
            sahkoposti: "Etunimi.Sukunimi@vayla.fi",
            sukunimi: "Sukunimi",
          },
          {
            etunimi: "Joku",
            puhelinnumero: "02998765",
            sahkoposti: "Joku.Jokunen@vayla.fi",
            sukunimi: "Jokunen",
          },
        ],
      },
    };
    const hyvaksymisPaatosVaiheJulkaisut = [
      {
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1.2.246.578.5.100.2147637429.4251089044",
            jarjestys: 1,
            kategoriaId: "osa_a",
            nimi: "TYHJÄ.txt",
            tiedosto: "/hyvaksymispaatos/1/TYHJÄ.txt",
            tila: AineistoTila.VALMIS,

            tuotu: "2020-01-01T00:00:00+02:00",
          },
        ],
        hallintoOikeus: HallintoOikeus.HAMEENLINNA,
        hyvaksyja: "A000112",
        hyvaksymisPaatos: [
          {
            dokumenttiOid: "1.2.246.578.5.100.2147637429.4251089044",
            jarjestys: 1,
            nimi: "TYHJÄ.txt",
            tiedosto: "/hyvaksymispaatos/1/paatos/TYHJÄ.txt",
            tila: AineistoTila.VALMIS,
            tuotu: "2020-01-01T00:00:00+02:00",
          },
        ],
        hyvaksymisPaatosVaihePDFt: {
          SUOMI: {
            hyvaksymisIlmoitusLausunnonantajillePDFPath:
              "/hyvaksymispaatos/1/T431_3 Ilmoitus hyvaksymispaatoksesta lausunnon antajille.pdf",
            hyvaksymisIlmoitusMuistuttajillePDFPath: "/hyvaksymispaatos/1/T431_4 Ilmoitus hyvaksymispaatoksesta muistuttajille.pdf",
            hyvaksymisKuulutusPDFPath: "/hyvaksymispaatos/1/T431 Kuulutus hyvaksymispaatoksen nahtavillaolo.pdf",
            ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath:
              "/hyvaksymispaatos/1/T431_1 Ilmoitus hyvaksymispaatoksesta kunnalle ja toiselle viranomaiselle.pdf",
            ilmoitusHyvaksymispaatoskuulutuksestaPDFPath: "/hyvaksymispaatos/1/T431_2 Ilmoitus hyvaksymispaatoksen kuulutuksesta.pdf",
          },
        },
        hyvaksymisPaiva: "2022-11-03",
        id: 1,
        ilmoituksenVastaanottajat: {
          kunnat: [
            {
              id: 491,
              lahetetty: "2020-01-01T00:00:00+02:00",
              messageId: "messageId_test",
              sahkoposti: "mikkeli@mikke.li",
            },
            {
              id: 178,
              lahetetty: "2020-01-01T00:00:00+02:00",
              messageId: "messageId_test",
              sahkoposti: "juva@ju.va",
            },
            {
              id: 740,
              lahetetty: "2020-01-01T00:00:00+02:00",
              messageId: "messageId_test",
              sahkoposti: "savonlinna@savonlin.na",
            },
          ],
          viranomaiset: [
            {
              lahetetty: "2020-01-01T00:00:00+02:00",
              messageId: "messageId_test",
              nimi: IlmoitettavaViranomainen.ETELA_SAVO_ELY,
              sahkoposti: "kirjaamo.etela-savo@ely-keskus.fi",
            },
          ],
        },
        kielitiedot: saameProjekti.kielitiedot,
        kuulutusPaiva: "2022-06-09",
        kuulutusVaihePaattyyPaiva: "2020-01-01T00:00:00+02:00",
        muokkaaja: "A000112",
        tila: KuulutusJulkaisuTila.HYVAKSYTTY,
        velho: saameProjekti.velho,
        yhteystiedot: [
          {
            etunimi: "A-tunnus1",
            organisaatio: "CGI Suomi Oy",
            puhelinnumero: "123",
            sahkoposti: "mikko.haapamki@cgi.com",
            sukunimi: "Hassu",
          },
          {
            etunimi: "Etunimi",
            puhelinnumero: "0293121213",
            sahkoposti: "Etunimi.Sukunimi@vayla.fi",
            sukunimi: "Sukunimi",
          },
          {
            etunimi: "Joku",
            puhelinnumero: "02998765",
            sahkoposti: "Joku.Jokunen@vayla.fi",
            sukunimi: "Jokunen",
          },
        ],
      },
    ];
    return {
      ...saameProjekti,
      kasittelynTila: {
        hyvaksymispaatos: { paatoksenPvm: "2022-02-03", asianumero: "traficom-123" },
        ensimmainenJatkopaatos: { paatoksenPvm: "2022-02-03", asianumero: "traficom-123" },
        toinenJatkopaatos: { paatoksenPvm: "2022-02-03", asianumero: "traficom-123" },
      },
      hyvaksymisPaatosVaihe,
      hyvaksymisPaatosVaiheJulkaisut,
      jatkoPaatos1Vaihe: cloneDeep(hyvaksymisPaatosVaihe),
      jatkoPaatos1VaiheJulkaisut: cloneDeep(hyvaksymisPaatosVaiheJulkaisut),
      jatkoPaatos2Vaihe: cloneDeep(hyvaksymisPaatosVaihe),
      jatkoPaatos2VaiheJulkaisut: cloneDeep(hyvaksymisPaatosVaiheJulkaisut),
    };
  }

  dbProjektiHyvaksymisMenettelyssaSaame(): DBProjekti {
    const kielitiedotPohjoissaame = {
      ensisijainenKieli: Kieli.SUOMI,
      projektinNimiVieraskielella: "Projektinimi saameksi",
      toissijainenKieli: Kieli.POHJOISSAAME,
    };
    return {
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
        suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
        asiatunnusVayla: "VAYLA/" + this.PROJEKTI3_OID + "/2022",
        asiatunnusELY: "ELY/" + this.PROJEKTI3_OID + "/2022",
      },
      aloitusKuulutusJulkaisut: [
        {
          aloituskuulutusPDFt: {
            SUOMI: {
              aloituskuulutusIlmoitusPDFPath:
                "/aloituskuulutus/ILMOITUS TOIMIVALTAISEN VIRANOMAISEN KUULUTUKSESTA Marikan testiprojekti.pdf",
              aloituskuulutusPDFPath: "/aloituskuulutus/KUULUTUS SUUNNITTELUN ALOITTAMISESTA Marikan testiprojekti.pdf",
            },
          },
          kielitiedot: kielitiedotPohjoissaame,
          ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
          kuulutusPaiva: "2022-03-28",
          muokkaaja: ProjektiFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
          hyvaksyja: ProjektiFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
          hyvaksymisPaiva: "2022-03-21",
          hankkeenKuvaus: {
            SUOMI:
              "Suunnittelu kohde on osa Hyvinkää-Hanko sähköistyshanketta, jossa toteutetaan myös tasoristeysten toimenpiteitä. Hyväksytyssä ratasuunnitelmassa kyseisessä kohdassa on hyväksytty suunnitelmaratkaisuna Kisan seisakkeen ja Leksvallin tasoristeysten poistaminen parantamalla Helmströmin tasoristeyksen kohdalle uusi tasoristeys. Nyt käynnistetään Rata-suunnitelman päivitys kyseisessä kohdassa ja suunnitellaan kaikkien kolmen tasoristeyksen poistaminen uudella Leksvallin ylikulkusillalla.",
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
            suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
            kunnat: mikkeliJuvaSavonlinna,
            maakunnat: uusimaaPirkanmaa,
          },
          id: 1,
          tila: KuulutusJulkaisuTila.HYVAKSYTTY,
          siirtyySuunnitteluVaiheeseen: "2022-04-28",
        },
      ],
      aloitusKuulutus: {
        id: 1,
        hankkeenKuvaus: {
          SUOMI:
            "Suunnittelu kohde on osa Hyvinkää-Hanko sähköistyshanketta, jossa toteutetaan myös tasoristeysten toimenpiteitä. Hyväksytyssä ratasuunnitelmassa kyseisessä kohdassa on hyväksytty suunnitelmaratkaisuna Kisan seisakkeen ja Leksvallin tasoristeysten poistaminen parantamalla Helmströmin tasoristeyksen kohdalle uusi tasoristeys. Nyt käynnistetään Rata-suunnitelman päivitys kyseisessä kohdassa ja suunnitellaan kaikkien kolmen tasoristeyksen poistaminen uudella Leksvallin ylikulkusillalla.",
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
        kuulutusPaiva: "2022-03-28",
        siirtyySuunnitteluVaiheeseen: "2022-04-28",
      },
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 0,
        vuorovaikutusJulkaisuPaiva: "2022-04-28",
        arvioSeuraavanVaiheenAlkamisesta: {
          SUOMI: "Syksy 2024",
        },
        hankkeenKuvaus: {
          SUOMI:
            "Tavoitteena on nykyisen ja tulevan maankäytön liittäminen\nluontevasti Hämeenlinnanväylään, huomioida alueen melunsuojaus, parantaa henkilöautoliikenteen ja joukkoliikenteen\nsujuvuutta ja turvallisuutta sekä tehdä jalankulun ja pyöräilyn\nyhteydet sujuviksi ja turvallisiksi. Raskaan liikenteen sujuvuuden ja matka-ajan ennustettavuuden parantaminen on myös\nyksi tavoitteista.",
        },
        tila: VuorovaikutusKierrosTila.JULKINEN,
        suunnittelunEteneminenJaKesto: {
          SUOMI:
            "Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
        },
        ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
        vuorovaikutusTilaisuudet: [
          {
            tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
            nimi: {
              SUOMI: "Lorem ipsum",
            },
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
          vuorovaikutusJulkaisuPaiva: "2022-04-28",
          arvioSeuraavanVaiheenAlkamisesta: {
            SUOMI: "Syksy 2024",
          },
          hankkeenKuvaus: {
            SUOMI:
              "Tavoitteena on nykyisen ja tulevan maankäytön liittäminen\nluontevasti Hämeenlinnanväylään, huomioida alueen melunsuojaus, parantaa henkilöautoliikenteen ja joukkoliikenteen\nsujuvuutta ja turvallisuutta sekä tehdä jalankulun ja pyöräilyn\nyhteydet sujuviksi ja turvallisiksi. Raskaan liikenteen sujuvuuden ja matka-ajan ennustettavuuden parantaminen on myös\nyksi tavoitteista.",
          },
          tila: VuorovaikutusKierrosTila.JULKINEN,
          ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
          vuorovaikutusTilaisuudet: [
            {
              tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
              nimi: {
                SUOMI: "Lorem ipsum",
              },
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
          },
          suunnittelunEteneminenJaKesto: {
            SUOMI:
              "Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
          },
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
        hankkeenKuvaus: {
          SUOMI: "Lorem Ipsum nahtavillaoloVaihe",
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
          kielitiedot: kielitiedotPohjoissaame,
          kuulutusPaiva: "2022-06-20T11:54",
          kuulutusVaihePaattyyPaiva: "2022-07-21T11:54",
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
            suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
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
      kielitiedot: kielitiedotPohjoissaame,
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
  }

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
              ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath: "3.pdf",
              hyvaksymisKuulutusPDFPath: "4.pdf",
              ilmoitusHyvaksymispaatoskuulutuksestaPDFPath: "5.pdf",
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
            suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.VAYLAVIRASTO,
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
  };

  vuorovaikutus: VuorovaikutusKierros = {
    vuorovaikutusNumero: 0,
    julkinen: true,
    hankkeenKuvaus: this.hankkeenKuvausSuunnitteluVaiheessa,
    vuorovaikutusJulkaisuPaiva: "2022-03-23",
    videot: [
      {
        SUOMI: { nimi: "Esittely", url: "https://video" },
        RUOTSI: { nimi: "RUOTSIKSI Esittely", url: "https://sv/video" },
      },
    ],
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
        nimi: {
          SUOMI: "Lorem ipsum",
          RUOTSI: "RUOTSIKSI Lorem ipsum",
        },
        paivamaara: "2022-03-04",
        alkamisAika: "15:00",
        paattymisAika: "16:00",
        kaytettavaPalvelu: KaytettavaPalvelu.TEAMS,
        linkki: "https://linkki_tilaisuuteen",
      },
      {
        tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
        nimi: {
          SUOMI: "Lorem ipsum two",
          RUOTSI: "RUOTSIKSI Lorem ipsum two",
        },
        paivamaara: "2022-04-05",
        alkamisAika: "10:00",
        paattymisAika: "11:00",
        paikka: {
          SUOMI: "Kunnantalo",
          RUOTSI: "RUOTSIKSI Kunnantalo",
        },
        osoite: {
          SUOMI: "Katu 123",
          RUOTSI: "Gatan 123",
        },
        postinumero: "00100",
        postitoimipaikka: {
          SUOMI: "Helsinki",
          RUOTSI: "Helsingfors",
        },
        Saapumisohjeet: {
          SUOMI: "Ensimmäinen ovi vasemmalla",
          RUOTSI: "RUOTSIKSI Ensimmäinen ovi vasemmalla",
        },
      },
      {
        tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
        nimi: {
          SUOMI: "Soittoaikatilaisuuden nimi tässä",
          RUOTSI: "RUOTSIKSI Soittoaikatilaisuuden nimi tässä",
        },
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
        nimi: {
          SUOMI: "Toisen soittoaikatilaisuuden nimi tässä",
          RUOTSI: "RUOTSIKSI Toisen soittoaikatilaisuuden nimi tässä",
        },
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
    elyOrganisaatio: kayttaja.elyOrganisaatio || undefined,
    muokattavissa: kayttaja.muokattavissa || undefined,
  };
}
