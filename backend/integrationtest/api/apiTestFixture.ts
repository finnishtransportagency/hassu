import {
  AloitusKuulutus,
  Kieli,
  Kielitiedot,
  KielitiedotInput,
  SuunnitteluSopimus,
  SuunnitteluSopimusInput,
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
    esitettavatYhteystiedot: [
      {
        __typename: "Yhteystieto",
        etunimi: "Marko",
        sukunimi: "Koi",
        sahkoposti: "markku.koi@koi.com",
        organisaatio: "Kajaani",
        puhelinnumero: "0293121213",
      },
    ],
  };

  kielitiedotInput: KielitiedotInput = {
    ensisijainenKieli: Kieli.SUOMI,
  };

  kielitiedot: Kielitiedot = {
    __typename: "Kielitiedot",
    ensisijainenKieli: Kieli.SUOMI,
  };
}

export const apiTestFixture = new ApiTestFixture();
