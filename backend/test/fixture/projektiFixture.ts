import {
  AloitusKuulutus,
  AloitusKuulutusInput,
  Kieli,
  Projekti,
  ProjektiKayttaja,
  ProjektiRooli,
  ProjektiTyyppi,
  Status,
  TallennaProjektiInput,
} from "../../../common/graphql/apiModel";
import { DBProjekti } from "../../src/database/model/projekti";

export class ProjektiFixture {
  public PROJEKTI1_NIMI = "Testiprojekti 1";
  public PROJEKTI1_MUISTIINPANO_1 = "Testiprojekti 1:n muistiinpano";
  public PROJEKTI1_MUISTIINPANO_2 = "Testiprojekti 1:n muistiinpano 2";
  public PROJEKTI1_OID = "1";

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
    hankkeenKuvaus: "Lorem Ipsum",
    hankkeenKuvausRuotsi: "På Svenska",
    hankkeenKuvausSaame: "Saameksi",
    siirtyySuunnitteluVaiheeseen: "2022-01-01",
    elyKeskus: "Pirkanmaa",
    esitettavatYhteystiedot: [
      {
        etunimi: "Marko",
        sukunimi: "Koi",
        sahkoposti: "markku.koi@koi.com",
        organisaatio: "Kajaani",
        puhelinnumero: "0293121213",
      },
    ],
  };

  aloitusKuulutus: AloitusKuulutus = {
    __typename: "AloitusKuulutus",
    ...this.aloitusKuulutusInput,
    ilmoituksenVastaanottajat: {
      __typename: "IlmoituksenVastaanottajat",
      kunnat: this.aloitusKuulutusInput.ilmoituksenVastaanottajat?.kunnat?.map((k) => ({
        __typename: "KuntaVastaanottaja",
        ...k,
      })),
      viranomaiset: this.aloitusKuulutusInput.ilmoituksenVastaanottajat?.viranomaiset?.map((v) => ({
        __typename: "ViranomaisVastaanottaja",
        ...v,
      })),
    },
    esitettavatYhteystiedot: this.aloitusKuulutusInput.esitettavatYhteystiedot.map((yt) => ({
      __typename: "Yhteystieto",
      ...yt,
    })),
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
      kunnat: ["Tampere", "Nokia"],
      vaylamuoto: ["tie"],
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
      hankkeenKuvaus: "Lorem Ipsum",
      hankkeenKuvausRuotsi: "På svenska",
      hankkeenKuvausSaame: "Saameksi",
      siirtyySuunnitteluVaiheeseen: "2022-01-01",
      elyKeskus: "Pirkanmaa",
      esitettavatYhteystiedot: [
        {
          etunimi: "Marko",
          sukunimi: "Koi",
          sahkoposti: "markku.koi@koi.com",
          organisaatio: "Kajaani",
          puhelinnumero: "0293121213",
        },
      ],
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
  };
}
