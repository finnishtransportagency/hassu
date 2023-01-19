import {
  AloitusKuulutus,
  AloitusKuulutusInput,
  IlmoitettavaViranomainen,
  IlmoituksenVastaanottajat,
  KaytettavaPalvelu,
  Kieli,
  Kielitiedot,
  KielitiedotInput,
  LokalisoituTekstiInput,
  MuokkausTila,
  NahtavillaoloVaiheInput,
  SuunnitteluSopimus,
  SuunnitteluSopimusInput,
  VuorovaikutusKierrosInput,
  VuorovaikutusTilaisuusTyyppi,
  Yhteystieto,
  YhteystietoInput,
} from "../../../common/graphql/apiModel";
import { kuntametadata } from "../../../common/kuntametadata";

const nokia = kuntametadata.idForKuntaName("Nokia");
const mikkeli = kuntametadata.idForKuntaName("Mikkeli");
const juva = kuntametadata.idForKuntaName("Juva");
const savonlinna = kuntametadata.idForKuntaName("Savonlinna");

class ApiTestFixture {
  newNote = "uusi muistiinpano";

  createSuunnitteluSopimusInput = (uploadedFile: string, yhteysHenkilo: string): SuunnitteluSopimusInput => ({
    yhteysHenkilo,
    kunta: nokia,
    logo: uploadedFile,
  });

  suunnitteluSopimus = (yhteysHenkilo: string): SuunnitteluSopimus => ({
    __typename: "SuunnitteluSopimus",
    yhteysHenkilo,
    kunta: nokia,
  });

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

  yhteystietoInputLista2: YhteystietoInput[] = [
    {
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

  yhteystietoInputLista3: YhteystietoInput[] = [
    {
      etunimi: "Marko",
      sukunimi: "Koi",
      sahkoposti: "markku.koi@koi.com",
      organisaatio: "Kajaani",
      puhelinnumero: "0293121213",
    },
  ];

  ilmoituksenVastaanottajat: IlmoituksenVastaanottajat = {
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

  aloitusKuulutus: AloitusKuulutus = {
    __typename: "AloitusKuulutus",
    muokkausTila: MuokkausTila.MUOKKAUS,
    kuulutusPaiva: "2022-01-02",
    hankkeenKuvaus: {
      __typename: "LokalisoituTeksti",
      SUOMI: "Lorem Ipsum",
      RUOTSI: "På Svenska",
      SAAME: "Saameksi",
    },
    siirtyySuunnitteluVaiheeseen: "2022-01-01",
    kuulutusYhteystiedot: {
      __typename: "StandardiYhteystiedot",
      yhteysTiedot: this.yhteystietoLista,
      yhteysHenkilot: [],
    },
    ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
    uudelleenKuulutus: undefined,
  };

  aloitusKuulutusInput: AloitusKuulutusInput = {
    kuulutusPaiva: "2022-01-02",
    hankkeenKuvaus: {
      SUOMI: "Lorem Ipsum",
      RUOTSI: "På Svenska",
      SAAME: "Saameksi",
    },
    siirtyySuunnitteluVaiheeseen: "2022-01-01",
    kuulutusYhteystiedot: {
      yhteysTiedot: this.yhteystietoLista,
      yhteysHenkilot: [],
    },
    ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
    uudelleenKuulutus: undefined,
  };

  kielitiedotInput: KielitiedotInput = {
    ensisijainenKieli: Kieli.SUOMI,
  };

  kielitiedot: Kielitiedot = {
    __typename: "Kielitiedot",
    ensisijainenKieli: Kieli.SUOMI,
  };

  hankkeenKuvausSuunnittelu: LokalisoituTekstiInput = {
    SUOMI: "Lorem Ipsum suunnitteluvaihe",
    SAAME: "Saameksi suunnitteluvaihe",
  };

  vuorovaikutusKierros = (vuorovaikutusNumero: number, vuorovaikutusYhteysHenkilot?: string[]): VuorovaikutusKierrosInput => ({
    vuorovaikutusNumero,
    vuorovaikutusJulkaisuPaiva: "2022-03-23",
    videot: [{ nimi: "Esittely " + vuorovaikutusNumero, url: "https://video" }],
    kysymyksetJaPalautteetViimeistaan: "2022-03-23T23:48",
    esitettavatYhteystiedot: {
      yhteysTiedot: apiTestFixture.yhteystietoInputLista3,
      yhteysHenkilot: vuorovaikutusYhteysHenkilot,
    },
    esittelyaineistot: [],
    suunnitelmaluonnokset: [],
    ilmoituksenVastaanottajat: apiTestFixture.ilmoituksenVastaanottajat,
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
        esitettavatYhteystiedot: {
          yhteysTiedot: this.yhteystietoInputLista,
          yhteysHenkilot: vuorovaikutusYhteysHenkilot,
        },
      },
      {
        tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
        nimi: "Toisen soittoaikatilaisuuden nimi tässä",
        paivamaara: "2033-04-05",
        alkamisAika: "12:00",
        paattymisAika: "13:00",
        esitettavatYhteystiedot: {
          yhteysTiedot: this.yhteystietoInputLista,
          yhteysHenkilot: [],
        },
      },
    ],
  });

  nahtavillaoloVaiheAineisto = (): NahtavillaoloVaiheInput => ({
    aineistoNahtavilla: [{ dokumenttiOid: "123", nimi: "tiedosto.pdf" }],
  });

  nahtavillaoloVaihe = (kuulutusYhteysHenkilot: string[]): NahtavillaoloVaiheInput => ({
    hankkeenKuvaus: {
      SUOMI: "Lorem Ipsum nahtavillaoloVaihe",
      SAAME: "Saameksi nahtavillaoloVaihe",
    },
    kuulutusPaiva: "2022-06-07",
    kuulutusVaihePaattyyPaiva: "2042-06-07",
    muistutusoikeusPaattyyPaiva: "2042-06-08",
    ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
    kuulutusYhteystiedot: {
      yhteysHenkilot: kuulutusYhteysHenkilot,
      yhteysTiedot: this.yhteystietoInputLista,
    },
  });
}

export const apiTestFixture = new ApiTestFixture();
