import {
  AineistoTila,
  HallintoOikeus,
  IlmoitettavaViranomainen,
  KaytettavaPalvelu,
  KayttajaTyyppi,
  Kieli,
  KuulutusJulkaisuTila,
  ProjektiKayttaja,
  ProjektiTyyppi,
  SuunnittelustaVastaavaViranomainen,
  Vaihe,
  VuorovaikutusKierrosTila,
  VuorovaikutusTilaisuusTyyppi,
} from "hassu-common/graphql/apiModel";
import { kuntametadata } from "hassu-common/kuntametadata";
import { statusOrder } from "hassu-common/statusOrder";
import { vaiheToStatus } from "hassu-common/util/haeVaiheidentiedot";
import {
  AloitusKuulutus,
  AloitusKuulutusJulkaisu,
  DBProjekti,
  DBVaylaUser,
  HyvaksymisPaatosVaihe,
  HyvaksymisPaatosVaiheJulkaisu,
  IlmoituksenVastaanottajat,
  Kielitiedot,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheJulkaisu,
  StandardiYhteystiedot,
  Velho,
  VuorovaikutusKierros,
  VuorovaikutusKierrosJulkaisu,
  Yhteystieto,
} from "../../src/database/model";

const mikkeli = kuntametadata.idForKuntaName("Mikkeli");
const juva = kuntametadata.idForKuntaName("Juva");
const savonlinna = kuntametadata.idForKuntaName("Savonlinna");

const mikkeliJuvaSavonlinna = [mikkeli, juva, savonlinna];
const uusimaaPirkanmaa = kuntametadata.idsForMaakuntaNames(["Uusimaa", "Pirkanmaa"]);

export enum VaiheenTila {
  LUONNOS = "LUONNOS",
  ODOTTAA_HYVAKSYNTAA = "ODOTTAA_HYVAKSYNTAA",
  HYVAKSYTTY = "HYVAKSYTTY",
}

type OptinalNullableString = string | null | undefined;

export class DBProjektiForSpecificVaiheFixture {
  public PROJEKTI_NIMI = "Testiprojekti 2";
  public PROJEKTI_OID = "2";

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

  private mattiMeikalainenDBVaylaUser(): DBVaylaUser {
    return this.projektiKayttajaAsDBVaylaUser(DBProjektiForSpecificVaiheFixture.mattiMeikalainenProjektiKayttaja);
  }

  private velho(): Velho {
    return {
      nimi: this.PROJEKTI_NIMI,
      tyyppi: ProjektiTyyppi.TIE,
      kunnat: mikkeliJuvaSavonlinna,
      vaylamuoto: ["tie"],
      vastuuhenkilonEmail: DBProjektiForSpecificVaiheFixture.pekkaProjariProjektiKayttaja.email,
      maakunnat: uusimaaPirkanmaa,
      suunnittelustaVastaavaViranomainen: SuunnittelustaVastaavaViranomainen.UUDENMAAN_ELY,
      asiatunnusVayla: "VAYLA/" + this.PROJEKTI_OID + "/2022",
      asiatunnusELY: "ELY/" + this.PROJEKTI_OID + "/2022",
    };
  }

  private ilmoituksenVastaanottajat: IlmoituksenVastaanottajat = {
    kunnat: [
      {
        sahkoposti: "mikkeli@mikke.li",
        lahetetty: "2022-03-11T14:54",
        id: mikkeli,
      },
      {
        sahkoposti: "juva@ju.va",
        lahetetty: "2022-03-11T14:54",
        id: juva,
      },
      {
        sahkoposti: "savonlinna@savonlin.na",
        lahetetty: "2022-03-11T14:54",
        id: savonlinna,
      },
    ],
    viranomaiset: [
      {
        sahkoposti: "kirjaamo.etela-savo@ely-keskus.fi",
        lahetetty: "2022-03-11T14:54",
        nimi: IlmoitettavaViranomainen.ETELA_SAVO_ELY,
      },
    ],
  };

  private projektiBase(): DBProjekti {
    return {
      oid: this.PROJEKTI_OID,
      versio: 1,
      salt: "foo",
      paivitetty: "2022-03-15T14:30:00.000Z",
      tallennettu: true,
      kielitiedot: this.haeKielitiedot(),
      euRahoitus: false,
      vahainenMenettely: false,
      kasittelynTila: {
        hyvaksymispaatos: { paatoksenPvm: "2022-02-03", asianumero: "traficom-123" },
      },
      velho: this.velho(),
      kayttoOikeudet: [
        {
          tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
          ...this.projektiKayttajaAsDBVaylaUser(DBProjektiForSpecificVaiheFixture.pekkaProjariProjektiKayttaja),
        },
        this.mattiMeikalainenDBVaylaUser(),
      ],
    };
  }

  /* eslint-disable no-fallthrough */
  public getProjektiForVaihe(currentVaihe: Vaihe, vaiheenTila: VaiheenTila): DBProjekti {
    const projekti = this.projektiBase();

    const haeVaiheenTila = (currentVaihe: Vaihe, vaihe: Vaihe) => {
      const vaiheIsBeforeCurrentVaihe = statusOrder(vaiheToStatus[vaihe]) < statusOrder(vaiheToStatus[currentVaihe]);
      return vaiheIsBeforeCurrentVaihe ? VaiheenTila.HYVAKSYTTY : vaiheenTila;
    };

    switch (currentVaihe) {
      case Vaihe.JATKOPAATOS2:
        projekti.jatkoPaatos2Vaihe = this.hyvaksymisPaatosVaihe("/jatkopaatos2/1");
        projekti.jatkoPaatos2VaiheJulkaisut = this.hyvaksymisPaatosVaiheJulkaisut(
          haeVaiheenTila(currentVaihe, Vaihe.JATKOPAATOS2),
          "/jatkopaatos2/1"
        );
      // fall through
      case Vaihe.JATKOPAATOS:
        projekti.jatkoPaatos1Vaihe = this.hyvaksymisPaatosVaihe("/jatkopaatos1/1");
        projekti.jatkoPaatos1VaiheJulkaisut = this.hyvaksymisPaatosVaiheJulkaisut(
          haeVaiheenTila(currentVaihe, Vaihe.JATKOPAATOS),
          "/jatkopaatos1/1"
        );
      // fall through
      case Vaihe.HYVAKSYMISPAATOS:
        projekti.hyvaksymisPaatosVaihe = this.hyvaksymisPaatosVaihe("/hyvaksymispaatos/1");
        projekti.hyvaksymisPaatosVaiheJulkaisut = this.hyvaksymisPaatosVaiheJulkaisut(
          haeVaiheenTila(currentVaihe, Vaihe.HYVAKSYMISPAATOS),
          "/hyvaksymispaatos/1"
        );
      // fall through
      case Vaihe.NAHTAVILLAOLO:
        projekti.nahtavillaoloVaihe = this.haeNahtavillaolo();
        projekti.nahtavillaoloVaiheJulkaisut = this.haeNahtavillaoloJulkaisut(haeVaiheenTila(currentVaihe, Vaihe.NAHTAVILLAOLO));
      // fall through
      case Vaihe.SUUNNITTELU:
        projekti.vuorovaikutusKierros = this.haeVuorovaikutus();
        projekti.vuorovaikutusKierrosJulkaisut = this.haeVuorovaikutusJulkaisut(haeVaiheenTila(currentVaihe, Vaihe.SUUNNITTELU));
      // fall through
      case Vaihe.ALOITUSKUULUTUS:
        projekti.aloitusKuulutus = this.haeAloituskuulutus();
        projekti.aloitusKuulutusJulkaisut = this.haeAloituskuulutusJulkaisu(haeVaiheenTila(currentVaihe, Vaihe.ALOITUSKUULUTUS));
      // fall through
    }

    return projekti;
  }

  private haeAloituskuulutusJulkaisu(vaiheenTila: VaiheenTila): AloitusKuulutusJulkaisu[] | undefined {
    if (vaiheenTila === VaiheenTila.LUONNOS) {
      return undefined;
    }
    return [
      {
        aloituskuulutusPDFt: {
          SUOMI: {
            aloituskuulutusIlmoitusPDFPath:
              "/aloituskuulutus/1/ILMOITUS TOIMIVALTAISEN VIRANOMAISEN KUULUTUKSESTA Marikan testiprojekti.pdf",
            aloituskuulutusPDFPath: "/aloituskuulutus/1/KUULUTUS SUUNNITTELUN ALOITTAMISESTA Marikan testiprojekti.pdf",
          },
          RUOTSI: {
            aloituskuulutusIlmoitusPDFPath: "/aloituskuulutus/1/MEDDELANDE OM KUNGORELSE FRAN BEHORIG MYNDIGHET Marikas testprojekt.pdf",
            aloituskuulutusPDFPath: "/aloituskuulutus/1/KUNGORELSE OM INLEDANDET AV PLANERINGEN Marikas testprojekt.pdf",
          },
        },
        kielitiedot: this.haeKielitiedot(),
        ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
        kuulutusPaiva: "2022-03-28T14:28",
        muokkaaja: this.muokkaaja(),
        hyvaksyja: this.hyvaksyja(vaiheenTila),
        hankkeenKuvaus: {
          SUOMI:
            "Suunnittelu kohde on osa Hyvinkää-Hanko sähköistyshanketta, jossa toteutetaan myös tasoristeysten toimenpiteitä. Hyväksytyssä ratasuunnitelmassa kyseisessä kohdassa on hyväksytty suunnitelmaratkaisuna Kisan seisakkeen ja Leksvallin tasoristeysten poistaminen parantamalla Helmströmin tasoristeyksen kohdalle uusi tasoristeys. Nyt käynnistetään Rata-suunnitelman päivitys kyseisessä kohdassa ja suunnitellaan kaikkien kolmen tasoristeyksen poistaminen uudella Leksvallin ylikulkusillalla.",
          RUOTSI:
            "Designplatsen är en del av elektrifieringsprojektet Hyvinge-Hangö, som också kommer att genomföra plankorsningsåtgärder. I den fastställda spårplanen är borttagandet av tävlingsstoppet och Leksvallskorsningen genom förbättring av en ny plankorsning vid Helmströms plankorsning vid denna punkt godkänd som planlösning. En uppdatering av Spårplanen kommer nu att lanseras då och man planerar att ta bort alla tre plankorsningarna på den nya Leksvallsöverfarten.",
        },
        yhteystiedot: this.yhteystiedot(),
        kuulutusYhteystiedot: this.kuulutusYhteystiedot(),
        velho: this.velho(),
        id: 1,
        tila: this.julkaisunTila(vaiheenTila),
        siirtyySuunnitteluVaiheeseen: "2022-04-28T14:28",
        hyvaksymisPaiva: this.hyvaksymisPaiva(vaiheenTila),
      },
    ];
  }

  private muokkaaja(): OptinalNullableString {
    return DBProjektiForSpecificVaiheFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus;
  }

  private hyvaksymisPaiva(vaiheenTila: VaiheenTila): string | null | undefined {
    return vaiheenTila === VaiheenTila.HYVAKSYTTY ? "2022-03-21" : undefined;
  }

  private julkaisunTila(vaiheenTila: VaiheenTila): KuulutusJulkaisuTila | null | undefined {
    return vaiheenTila === VaiheenTila.HYVAKSYTTY ? KuulutusJulkaisuTila.HYVAKSYTTY : KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA;
  }

  private hyvaksyja(vaiheenTila: VaiheenTila): string | null | undefined {
    return vaiheenTila === VaiheenTila.HYVAKSYTTY
      ? DBProjektiForSpecificVaiheFixture.pekkaProjariProjektiKayttaja.kayttajatunnus
      : undefined;
  }

  private haeKielitiedot(): Kielitiedot {
    return {
      projektinNimiVieraskielella: "Marikas testprojekt",
      toissijainenKieli: Kieli.RUOTSI,
      ensisijainenKieli: Kieli.SUOMI,
    };
  }

  private haeAloituskuulutus(): AloitusKuulutus {
    return {
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
      kuulutusYhteystiedot: this.kuulutusYhteystiedot(),
    };
  }

  private kuulutusYhteystiedot(): StandardiYhteystiedot {
    return {
      yhteysTiedot: this.yhteystiedot(),
      yhteysHenkilot: [
        DBProjektiForSpecificVaiheFixture.pekkaProjariProjektiKayttaja.kayttajatunnus,
        DBProjektiForSpecificVaiheFixture.mattiMeikalainenProjektiKayttaja.kayttajatunnus,
      ],
    };
  }

  private yhteystiedot(): Yhteystieto[] {
    return [
      {
        etunimi: "Marko",
        sukunimi: "Koi",
        sahkoposti: "markku.koi@koi.com",
        organisaatio: "Kajaani",
        puhelinnumero: "0293121213",
      },
    ];
  }

  private haeVuorovaikutus(): VuorovaikutusKierros {
    return {
      vuorovaikutusNumero: 1,
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
      esitettavatYhteystiedot: this.esitettavatYhteystiedot(),
    };
  }

  private esitettavatYhteystiedot(): StandardiYhteystiedot {
    return {
      yhteysTiedot: [],
      yhteysHenkilot: ["A000112"],
    };
  }

  private haeVuorovaikutusJulkaisut(vaiheenTila: VaiheenTila): VuorovaikutusKierrosJulkaisu[] | undefined {
    if (vaiheenTila !== VaiheenTila.HYVAKSYTTY) {
      return undefined;
    }
    return [
      {
        id: 1,
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
        yhteystiedot: this.yhteystiedot(),
        esitettavatYhteystiedot: this.esitettavatYhteystiedot(),
        vuorovaikutusPDFt: {
          [Kieli.SUOMI]: {
            kutsuPDFPath: "suunnitteluvaihe/vuorovaikutus_1/1.pdf",
          },
          [Kieli.RUOTSI]: {
            kutsuPDFPath: "suunnitteluvaihe/vuorovaikutus_1/2.pdf",
          },
        },
        suunnittelunEteneminenJaKesto: {
          SUOMI:
            "Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
          RUOTSI:
            "RUOTSIKSI Välin Kehä I–Kaivoksela tiesuunnitelma valmistuu 4/2021.\nHankkeen jatkosuunnittelun ja toteuttamisen aikataulusta\nei ole päätöksiä.",
        },
      },
    ];
  }

  private haeNahtavillaoloJulkaisut(vaiheenTila: VaiheenTila): NahtavillaoloVaiheJulkaisu[] | undefined {
    if (vaiheenTila === VaiheenTila.LUONNOS) {
      return undefined;
    }
    return [
      {
        projektiOid: this.PROJEKTI_OID,
        aineistoNahtavilla: [],
        hankkeenKuvaus: {
          RUOTSI:
            "Syftet med fasen är att på ett naturligt sätt koppla nuvarande och framtida markanvändning till Tavastehusvägen, att ta hänsyn till områdets bullerskydd, att förbättra flödet och säkerheten för passagerare och kollektivtrafik samt att göra gång- och cykelförbindelserna smidiga. och säker. Att förbättra flödet av tung trafik och förutsägbarheten i restid är också ett av målen.",
          SUOMI:
            "Nähtävilläolovaiheen tavoitteena on nykyisen ja tulevan maankäytön liittäminen luontevasti Hämeenlinnanväylään, huomioida alueen melunsuojaus, parantaa henkilöautoliikenteen ja joukkoliikenteen sujuvuutta ja turvallisuutta sekä tehdä jalankulun ja pyöräilyn yhteydet sujuviksi ja turvallisiksi. Raskaan liikenteen sujuvuuden ja matka-ajan ennustettavuuden parantaminen on myös yksi tavoitteista.",
        },
        hyvaksyja: this.hyvaksyja(vaiheenTila),
        hyvaksymisPaiva: this.hyvaksymisPaiva(vaiheenTila),
        id: 1,
        ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
        kielitiedot: this.haeKielitiedot(),
        kuulutusPaiva: "2022-06-20T11:54",
        kuulutusVaihePaattyyPaiva: "2042-07-21T11:54",
        yhteystiedot: this.yhteystiedot(),
        kuulutusYhteystiedot: this.kuulutusYhteystiedot(),
        muistutusoikeusPaattyyPaiva: "2042-07-21T11:54",
        muokkaaja: this.muokkaaja(),
        tila: this.julkaisunTila(vaiheenTila),
        velho: this.velho(),
        nahtavillaoloPDFt: {
          SUOMI: {
            nahtavillaoloIlmoitusPDFPath: "/nahtavillaolo/1/1.pdf",
            nahtavillaoloPDFPath: "/nahtavillaolo/1/2.pdf",
            nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath: "/nahtavillaolo/1/3.pdf",
          },
          RUOTSI: {
            nahtavillaoloIlmoitusPDFPath: "/nahtavillaolo/1/1 sv.pdf",
            nahtavillaoloPDFPath: "/nahtavillaolo/1/2 sv.pdf",
            nahtavillaoloIlmoitusKiinteistonOmistajallePDFPath: "/nahtavillaolo/1/3 sv.pdf",
          },
        },
      },
    ];
  }

  private haeNahtavillaolo(): NahtavillaoloVaihe {
    return {
      id: 1,
      hankkeenKuvaus: {
        SUOMI: "Lorem Ipsum nahtavillaoloVaihe",
      },
      kuulutusPaiva: "2022-06-07",
      kuulutusVaihePaattyyPaiva: "2022-06-07",
      muistutusoikeusPaattyyPaiva: "2022-06-08",
      ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
      kuulutusYhteystiedot: this.kuulutusYhteystiedot(),
    };
  }

  private hyvaksymisPaatosVaiheJulkaisut(vaiheenTila: VaiheenTila, polku: string): HyvaksymisPaatosVaiheJulkaisu[] | undefined {
    if (vaiheenTila === VaiheenTila.LUONNOS) {
      return undefined;
    }

    return [
      {
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1.2.246.578.5.100.2147637429.4251089044",
            jarjestys: 1,
            kategoriaId: "osa_a",
            nimi: "TYHJÄ.txt",
            tiedosto: polku + "/TYHJÄ.txt",
            tila: AineistoTila.VALMIS,
            uuid: "123",
            tuotu: "2020-01-01T00:00:00+02:00",
          },
        ],
        hallintoOikeus: HallintoOikeus.HAMEENLINNA,
        hyvaksyja: this.hyvaksyja(vaiheenTila),
        hyvaksymisPaatos: [
          {
            dokumenttiOid: "1.2.246.578.5.100.2147637429.4251089044",
            jarjestys: 1,
            nimi: "TYHJÄ.txt",
            tiedosto: polku + "/paatos/TYHJÄ.txt",
            tila: AineistoTila.VALMIS,
            uuid: "456",
            tuotu: "2020-01-01T00:00:00+02:00",
          },
        ],
        hyvaksymisPaatosVaihePDFt: {
          SUOMI: {
            hyvaksymisIlmoitusLausunnonantajillePDFPath: polku + "/T431_3 Ilmoitus hyvaksymispaatoksesta lausunnon antajille.pdf",
            hyvaksymisIlmoitusMuistuttajillePDFPath: polku + "/T431_4 Ilmoitus hyvaksymispaatoksesta muistuttajille.pdf",
            hyvaksymisKuulutusPDFPath: polku + "/T431 Kuulutus hyvaksymispaatoksen nahtavillaolo.pdf",
            ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath:
              polku + "/T431_1 Ilmoitus hyvaksymispaatoksesta kunnalle ja toiselle viranomaiselle.pdf",
            ilmoitusHyvaksymispaatoskuulutuksestaPDFPath: polku + "/T431_2 Ilmoitus hyvaksymispaatoksen kuulutuksesta.pdf",
          },
        },
        hyvaksymisPaiva: this.hyvaksymisPaiva(vaiheenTila),
        id: 1,
        ilmoituksenVastaanottajat: this.ilmoituksenVastaanottajat,
        kielitiedot: this.haeKielitiedot(),
        kuulutusPaiva: "2022-06-09",
        kuulutusVaihePaattyyPaiva: "2020-01-01T00:00:00+02:00",
        muokkaaja: this.muokkaaja(),
        tila: this.julkaisunTila(vaiheenTila),
        velho: this.velho(),
        yhteystiedot: this.yhteystiedot(),
        kuulutusYhteystiedot: this.kuulutusYhteystiedot(),
      },
    ];
  }

  private hyvaksymisPaatosVaihe(polku: string): HyvaksymisPaatosVaihe {
    return {
      aineistoNahtavilla: [
        {
          dokumenttiOid: "1.2.246.578.5.100.2147637429.4251089044",
          jarjestys: 1,
          kategoriaId: "osa_a",
          nimi: "TYHJÄ.txt",
          tiedosto: polku + "/TYHJÄ.txt",
          tila: AineistoTila.VALMIS,
          uuid: "123",
          tuotu: "2020-01-01T00:00:00+02:00",
        },
      ],
      hallintoOikeus: HallintoOikeus.HAMEENLINNA,
      hyvaksymisPaatos: [
        {
          dokumenttiOid: "1.2.246.578.5.100.2147637429.4251089044",
          jarjestys: 1,
          nimi: "TYHJÄ.txt",
          tiedosto: polku + "/paatos/TYHJÄ.txt",
          tila: AineistoTila.VALMIS,
          uuid: "456",
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
      kuulutusVaihePaattyyPaiva: "2040-01-01T00:00:00+02:00",
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
  }
  private projektiKayttajaAsDBVaylaUser(kayttaja: ProjektiKayttaja): DBVaylaUser {
    return {
      email: kayttaja.email,
      kayttajatunnus: kayttaja.kayttajatunnus,
      etunimi: kayttaja.etunimi,
      sukunimi: kayttaja.sukunimi,
      puhelinnumero: kayttaja.puhelinnumero ?? "",
      organisaatio: kayttaja.organisaatio ?? "",
      elyOrganisaatio: kayttaja.elyOrganisaatio ?? undefined,
      evkOrganisaatio: kayttaja.evkOrganisaatio ?? undefined,
      muokattavissa: kayttaja.muokattavissa ?? undefined,
    };
  }
}
