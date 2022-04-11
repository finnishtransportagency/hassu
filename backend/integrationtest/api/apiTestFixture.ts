import {
  AloitusKuulutus,
  HankkeenKuvauksetInput,
  IlmoitettavaViranomainen,
  KaytettavaPalvelu,
  Kieli,
  Kielitiedot,
  KielitiedotInput,
  SuunnitteluSopimus,
  SuunnitteluSopimusInput,
  SuunnitteluVaiheInput,
  VuorovaikutusTilaisuusTyyppi,
  Yhteystieto,
} from "../../../common/graphql/apiModel";

class ApiTestFixture {
  newNote = "uusi muistiinpano";

  createSuunnitteluSopimusInput = (uploadedFile): SuunnitteluSopimusInput => ({
    email: "Joku.Jossain@vayla.fi",
    puhelinnumero: "123",
    etunimi: "Joku",
    sukunimi: "Jossain",
    kunta: "Nokia",
    logo: uploadedFile,
  });

  suunnitteluSopimus: SuunnitteluSopimus = {
    __typename: "SuunnitteluSopimus",
    email: "Joku.Jossain@vayla.fi",
    puhelinnumero: "123",
    etunimi: "Joku",
    sukunimi: "Jossain",
    kunta: "Nokia",
  };

  esitettavatYhteystiedot: Yhteystieto[] = [
    {
      __typename: "Yhteystieto",
      etunimi: "Marko",
      sukunimi: "Koi",
      sahkoposti: "markku.koi@koi.com",
      organisaatio: "Kajaani",
      puhelinnumero: "0293121213",
    },
  ];

  aloitusKuulutus: AloitusKuulutus = {
    __typename: "AloitusKuulutus",
    kuulutusPaiva: "2022-01-02",
    hankkeenKuvaus: {
      __typename: "HankkeenKuvaukset",
      SUOMI: "Lorem Ipsum",
      RUOTSI: "På Svenska",
      SAAME: "Saameksi",
    },
    siirtyySuunnitteluVaiheeseen: "2022-01-01",
    elyKeskus: "Pirkanmaa",
    esitettavatYhteystiedot: this.esitettavatYhteystiedot,
  };

  kielitiedotInput: KielitiedotInput = {
    ensisijainenKieli: Kieli.SUOMI,
  };

  kielitiedot: Kielitiedot = {
    __typename: "Kielitiedot",
    ensisijainenKieli: Kieli.SUOMI,
  };

  hankkeenKuvausSuunnittelu: HankkeenKuvauksetInput = {
    SUOMI: "Lorem Ipsum suunnitteluvaihe",
    SAAME: "Saameksi suunnitteluvaihe",
  };

  ilmoituksenVastaanottajat: {
    __typename: "IlmoituksenVastaanottajat";
    kunnat: [
      {
        sahkoposti: "mikkeli@mikke.li";
        lahetetty: "2022-03-11T14:54";
        nimi: "Mikkeli";
        __typename: "KuntaVastaanottaja";
      },
      {
        sahkoposti: "juva@ju.va";
        lahetetty: "2022-03-11T14:54";
        nimi: " Juva";
        __typename: "KuntaVastaanottaja";
      },
      {
        sahkoposti: "savonlinna@savonlin.na";
        lahetetty: "2022-03-11T14:54";
        nimi: " Savonlinna";
        __typename: "KuntaVastaanottaja";
      }
    ];
    viranomaiset: [
      {
        sahkoposti: "kirjaamo.etela-savo@ely-keskus.fi";
        lahetetty: "2022-03-11T14:54";
        nimi: IlmoitettavaViranomainen.ETELA_SAVO_ELY;
        __typename: "ViranomaisVastaanottaja";
      }
    ];
  };

  suunnitteluVaihe = (
    vuorovaikutusNumero: number,
    vuorovaikutusYhteysHenkilot?: string[],
    julkinen?: boolean
  ): SuunnitteluVaiheInput => ({
    vuorovaikutus: {
      vuorovaikutusNumero,
      julkinen,
      vuorovaikutusJulkaisuPaiva: "2022-03-23",
      aineistoPoistetaanNakyvista: "2222-03-23T23:45",
      videot: [{ nimi: "Esittely " + vuorovaikutusNumero, url: "https://video" }],
      kysymyksetJaPalautteetViimeistaan: "2022-03-23T23:48",
      esitettavatYhteystiedot: apiTestFixture.esitettavatYhteystiedot,
      ilmoituksenVastaanottajat: apiTestFixture.ilmoituksenVastaanottajat,
      vuorovaikutusYhteysHenkilot,
      vuorovaikutusTilaisuudet: [
        {
          tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
          nimi: "Lorem ipsum " + vuorovaikutusNumero,
          paivamaara: "2022-03-04",
          alkamisAika: "15:00",
          paattymisAika: "16:00",
          kaytettavaPalvelu: KaytettavaPalvelu.TEAMS,
          linkki: "https://linkki_tilaisuuteen",
        },
        {
          tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
          nimi: "Lorem ipsum two " + vuorovaikutusNumero,
          paivamaara: "2022-04-05",
          alkamisAika: "10:00",
          paattymisAika: "11:00",
          paikka: "Kunnantalo",
          osoite: "Katu 123",
          postinumero: "00100",
          postitoimipaikka: "Helsinki",
          Saapumisohjeet: "Ensimmäinen ovi vasemmalla",
        },
      ],
    },
  });
}

export const apiTestFixture = new ApiTestFixture();
