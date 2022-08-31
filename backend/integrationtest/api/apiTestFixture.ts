import {
  AloitusKuulutus,
  HankkeenKuvauksetInput,
  IlmoitettavaViranomainen,
  IlmoituksenVastaanottajat,
  KaytettavaPalvelu,
  Kieli,
  Kielitiedot,
  KielitiedotInput,
  NahtavillaoloVaiheInput,
  SuunnitteluSopimus,
  SuunnitteluSopimusInput,
  SuunnitteluVaiheInput,
  VuorovaikutusTilaisuusTyyppi,
  Yhteystieto,
  YhteystietoInput,
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

  yhteystietoLista: Yhteystieto[] = [
    {
      __typename: "Yhteystieto",
      etunimi: "Marko",
      sukunimi: "Koi",
      sahkoposti: "markku.koi@koi.com",
      organisaatio: "Kajaani",
      puhelinnumero: "0293121213",
    },
  ];

  yhteystietoInputLista: YhteystietoInput[] = [
    {
      etunimi: "Etunimi",
      sukunimi: "Sukunimi",
      sahkoposti: "Etunimi.Sukunimi@vayla.fi",
      organisaatio: "",
      puhelinnumero: "0293121213",
      titteli: "Projektipäällikkö",
    },
    {
      etunimi: "Joku",
      sukunimi: "Jokunen",
      sahkoposti: "Joku.Jokunen@vayla.fi",
      organisaatio: "",
      puhelinnumero: "02998765",
      titteli: "Konsultti",
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
    kuulutusYhteystiedot: {
      __typename: "KuulutusYhteystiedot",
      yhteysTiedot: this.yhteystietoLista,
      yhteysHenkilot: [],
    },
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

  ilmoituksenVastaanottajat: IlmoituksenVastaanottajat = {
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

  suunnitteluVaihe = (
    vuorovaikutusNumero: number,
    vuorovaikutusYhteysHenkilot?: string[],
    julkinen?: boolean
  ): SuunnitteluVaiheInput => ({
    vuorovaikutus: {
      vuorovaikutusNumero,
      julkinen,
      vuorovaikutusJulkaisuPaiva: "2022-03-23",
      videot: [{ nimi: "Esittely " + vuorovaikutusNumero, url: "https://video" }],
      kysymyksetJaPalautteetViimeistaan: "2022-03-23T23:48",
      esitettavatYhteystiedot: apiTestFixture.yhteystietoLista,
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
        {
          tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
          nimi: "Soittoaikatilaisuuden nimi tässä",
          paivamaara: "2022-04-05",
          alkamisAika: "10:00",
          paattymisAika: "11:00",
          projektiYhteysHenkilot: vuorovaikutusYhteysHenkilot,
          esitettavatYhteystiedot: this.yhteystietoInputLista,
        },
        {
          tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
          nimi: "Toisen soittoaikatilaisuuden nimi tässä",
          paivamaara: "2033-04-05",
          alkamisAika: "12:00",
          paattymisAika: "13:00",
          esitettavatYhteystiedot: this.yhteystietoInputLista,
        },
      ],
    },
  });

  nahtavillaoloVaihe = (kuulutusYhteysHenkilot: string[]): NahtavillaoloVaiheInput => ({
    hankkeenKuvaus: {
      SUOMI: "Lorem Ipsum nahtavillaoloVaihe",
      SAAME: "Saameksi nahtavillaoloVaihe",
    },
    kuulutusPaiva: "2022-06-07",
    kuulutusVaihePaattyyPaiva: "2042-06-07",
    muistutusoikeusPaattyyPaiva: "2042-06-08",
    kuulutusYhteysHenkilot,
    ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
    kuulutusYhteystiedot: this.yhteystietoInputLista,
  });
}

export const apiTestFixture = new ApiTestFixture();
