import cloneDeep from "lodash/cloneDeep";
import {
  AineistoTila,
  AloitusKuulutus,
  AloitusKuulutusInput,
  IlmoitettavaViranomainen,
  IlmoituksenVastaanottajat,
  IlmoituksenVastaanottajatInput,
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
} from "hassu-common/graphql/apiModel";
import { kuntametadata } from "hassu-common/kuntametadata";

const nokia = kuntametadata.idForKuntaName("Nokia");
const mikkeli = kuntametadata.idForKuntaName("Mikkeli");
const juva = kuntametadata.idForKuntaName("Juva");
const savonlinna = kuntametadata.idForKuntaName("Savonlinna");

class ApiTestFixture {
  newNote = "uusi muistiinpano";

  createSuunnitteluSopimusInput = (uploadedFile: string, yhteysHenkilo: string): SuunnitteluSopimusInput => ({
    yhteysHenkilo,
    kunta: nokia,
    logo: {
      SUOMI: uploadedFile,
    },
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

  ilmoituksenVastaanottajatInput: IlmoituksenVastaanottajatInput = {
    kunnat: [
      {
        sahkoposti: "mikkeli@mikke.li",
        id: mikkeli,
      },
      {
        sahkoposti: "juva@ju.va",
        id: juva,
      },
      {
        sahkoposti: "savonlinna@savonlin.na",
        id: savonlinna,
      },
    ],
    viranomaiset: [
      {
        sahkoposti: "kirjaamo.etela-savo@ely-keskus.fi",
        nimi: IlmoitettavaViranomainen.ETELA_SAVO_ELY,
      },
    ],
  };

  // Aloituskuulutukset vuonna 2022
  aloitusKuulutus: AloitusKuulutus = {
    __typename: "AloitusKuulutus",
    muokkausTila: MuokkausTila.MUOKKAUS,
    kuulutusPaiva: "2022-01-02",
    hankkeenKuvaus: {
      __typename: "LokalisoituTeksti",
      SUOMI: "Lorem Ipsum",
      RUOTSI: "På Svenska",
    },
    siirtyySuunnitteluVaiheeseen: "2023-01-01",
    kuulutusYhteystiedot: {
      __typename: "StandardiYhteystiedot",
      yhteysTiedot: this.yhteystietoLista,
      yhteysHenkilot: [],
    },
    ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
    uudelleenKuulutus: undefined,
    aloituskuulutusSaamePDFt: undefined,
  };

  aloitusKuulutusInput: AloitusKuulutusInput = {
    kuulutusPaiva: "2022-01-02",
    hankkeenKuvaus: {
      SUOMI: "Lorem Ipsum",
      RUOTSI: "På Svenska",
    },
    siirtyySuunnitteluVaiheeseen: "2023-01-01",
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
  };

  // Suunnitteluvaihe vuonna 2023
  vuorovaikutusKierros = (vuorovaikutusNumero: number, vuorovaikutusYhteysHenkilot?: string[]): VuorovaikutusKierrosInput => ({
    vuorovaikutusNumero,
    vuorovaikutusJulkaisuPaiva: "2023-01-01",
    videot: [
      {
        SUOMI: { nimi: "Esittely " + vuorovaikutusNumero, url: "https://video" },
      },
    ],
    kysymyksetJaPalautteetViimeistaan: "2023-01-30",
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
        nimi: {
          SUOMI: "Lorem ipsum " + vuorovaikutusNumero,
        },
        paivamaara: "2023-01-02",
        alkamisAika: "15:00",
        paattymisAika: "16:00",
        kaytettavaPalvelu: KaytettavaPalvelu.TEAMS,
        linkki: "https://linkki_tilaisuuteen",
      },
      {
        tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
        nimi: {
          SUOMI: "Lorem ipsum two " + vuorovaikutusNumero,
        },
        paivamaara: "2023-01-03",
        alkamisAika: "10:00",
        paattymisAika: "11:00",
        paikka: {
          SUOMI: "Kunnantalo",
        },
        osoite: {
          SUOMI: "Katu 123",
        },
        postinumero: "00100",
        postitoimipaikka: {
          SUOMI: "Helsinki",
        },
        lisatiedot: {
          SUOMI: "Ensimmäinen ovi vasemmalla",
        },
      },
      {
        tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
        nimi: {
          SUOMI: "Soittoaikatilaisuuden nimi tässä",
        },
        paivamaara: "2023-01-04",
        alkamisAika: "10:00",
        paattymisAika: "11:00",
        esitettavatYhteystiedot: {
          yhteysTiedot: this.yhteystietoInputLista,
          yhteysHenkilot: vuorovaikutusYhteysHenkilot,
        },
      },
      {
        tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
        nimi: {
          SUOMI: "Toisen soittoaikatilaisuuden nimi tässä",
        },
        paivamaara: "2023-01-05",
        alkamisAika: "12:00",
        paattymisAika: "13:00",
        esitettavatYhteystiedot: {
          yhteysTiedot: this.yhteystietoInputLista,
          yhteysHenkilot: [],
        },
      },
    ],
  });

  vuorovaikutusKierroksenTiedot = (vuorovaikutusNumero: number, vuorovaikutusYhteysHenkilot?: string[]): VuorovaikutusKierrosInput => {
    const vastaanottajat = cloneDeep(apiTestFixture.ilmoituksenVastaanottajatInput);

    return {
      vuorovaikutusNumero,
      vuorovaikutusJulkaisuPaiva: `2022-0${vuorovaikutusNumero + 1}-03`,
      hankkeenKuvaus: {
        SUOMI: "Hankkeen kuvaus",
      },
      esitettavatYhteystiedot: {
        yhteysTiedot: apiTestFixture.yhteystietoInputLista3,
        yhteysHenkilot: vuorovaikutusYhteysHenkilot,
      },
      ilmoituksenVastaanottajat: vastaanottajat,
      vuorovaikutusTilaisuudet: [
        {
          tyyppi: VuorovaikutusTilaisuusTyyppi.VERKOSSA,
          nimi: {
            SUOMI: "Lorem ipsum " + vuorovaikutusNumero,
          },
          paivamaara: `2023-0${vuorovaikutusNumero}-04`,
          alkamisAika: "15:00",
          paattymisAika: "16:00",
          kaytettavaPalvelu: KaytettavaPalvelu.TEAMS,
          linkki: "https://linkki_tilaisuuteen",
        },
        {
          tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
          nimi: {
            SUOMI: "Lorem ipsum two " + vuorovaikutusNumero,
          },
          paivamaara: `2023-0${vuorovaikutusNumero}-05`,
          alkamisAika: "10:00",
          paattymisAika: "11:00",
          paikka: {
            SUOMI: "Kunnantalo",
          },
          osoite: {
            SUOMI: "Katu 123",
          },
          postinumero: "00100",
          postitoimipaikka: {
            SUOMI: "Helsinki",
          },
          lisatiedot: {
            SUOMI: "Ensimmäinen ovi vasemmalla",
          },
        },
        {
          tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
          nimi: {
            SUOMI: "Soittoaikatilaisuuden nimi tässä",
          },
          paivamaara: `2023-0${vuorovaikutusNumero}-06`,
          alkamisAika: "10:00",
          paattymisAika: "11:00",
          esitettavatYhteystiedot: {
            yhteysTiedot: this.yhteystietoInputLista,
            yhteysHenkilot: vuorovaikutusYhteysHenkilot,
          },
        },
        {
          tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
          nimi: {
            SUOMI: "Toisen soittoaikatilaisuuden nimi tässä",
          },
          paivamaara: `2023-0${vuorovaikutusNumero}-30`,
          alkamisAika: "12:00",
          paattymisAika: "13:00",
          esitettavatYhteystiedot: {
            yhteysTiedot: this.yhteystietoInputLista,
            yhteysHenkilot: [],
          },
        },
      ],
    };
  };

  vuorovaikutusKierrosSuomiRuotsi = (vuorovaikutusNumero: number, vuorovaikutusYhteysHenkilot?: string[]): VuorovaikutusKierrosInput => ({
    vuorovaikutusNumero,
    vuorovaikutusJulkaisuPaiva: "2023-01-01",
    videot: [
      {
        SUOMI: { nimi: "Esittely " + vuorovaikutusNumero, url: "https://video.fi" },
        RUOTSI: { nimi: "RUOTSI Esittely " + vuorovaikutusNumero, url: "https://video.sv" },
      },
    ],
    kysymyksetJaPalautteetViimeistaan: "2023-01-30",
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
        nimi: {
          SUOMI: "Lorem ipsum " + vuorovaikutusNumero,
          RUOTSI: "RUOTSIKSI Lorem ipsum " + vuorovaikutusNumero,
        },
        paivamaara: "2023-01-04",
        alkamisAika: "15:00",
        paattymisAika: "16:00",
        kaytettavaPalvelu: KaytettavaPalvelu.TEAMS,
        linkki: "https://linkki_tilaisuuteen",
      },
      {
        tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
        nimi: {
          SUOMI: "Lorem ipsum two " + vuorovaikutusNumero,
          RUOTSI: "RUOTSIKSI Lorem ipsum two " + vuorovaikutusNumero,
        },
        paivamaara: "2023-01-05",
        alkamisAika: "10:00",
        paattymisAika: "11:00",
        paikka: {
          SUOMI: "Kunnantalo",
          RUOTSI: "RUOTSI Kunnantalo",
        },
        osoite: {
          SUOMI: "Katu 123",
          RUOTSI: "RUOTSIKSI Katu 123",
        },
        postinumero: "00100",
        postitoimipaikka: {
          SUOMI: "Helsinki",
          RUOTSI: "Helsingfors",
        },
        lisatiedot: {
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
        paivamaara: "2023-01-05",
        alkamisAika: "10:00",
        paattymisAika: "11:00",
        esitettavatYhteystiedot: {
          yhteysTiedot: this.yhteystietoInputLista,
          yhteysHenkilot: vuorovaikutusYhteysHenkilot,
        },
      },
      {
        tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
        nimi: {
          SUOMI: "Toisen soittoaikatilaisuuden nimi tässä",
          RUOTSI: "RUOTSIKSI Toisen soittoaikatilaisuuden nimi tässä",
        },
        paivamaara: "2023-01-30",
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
    aineistoNahtavilla: [
      {
        dokumenttiOid: "1.2.246.578.5.100.2147637429.4251089044",
        kategoriaId: "osa_a",
        nimi: "TYHJÄ.txt",
        tila: AineistoTila.ODOTTAA_TUONTIA,
        uuid: "aineisto123",
        jarjestys: 1,
      },
    ],
  });

  // Nähtävilläolovaihe vuonna 2024
  nahtavillaoloVaihe = (kuulutusYhteysHenkilot: string[]): NahtavillaoloVaiheInput => ({
    hankkeenKuvaus: {
      SUOMI: "Lorem Ipsum nahtavillaoloVaihe",
    },
    kuulutusPaiva: "2024-01-01",
    kuulutusVaihePaattyyPaiva: "2024-01-30",
    muistutusoikeusPaattyyPaiva: "2024-01-31",
    ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
    kuulutusYhteystiedot: {
      yhteysHenkilot: kuulutusYhteysHenkilot,
      yhteysTiedot: this.yhteystietoInputLista,
    },
  });
}

export const apiTestFixture = new ApiTestFixture();
