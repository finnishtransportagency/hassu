import {
  AineistoTila,
  ELY,
  Elinvoimakeskus,
  IlmoitettavaViranomainen,
  Kieli,
  ProjektiTyyppi,
  SuunnittelustaVastaavaViranomainen,
  LadattuTiedostoTila,
  KayttajaTyyppi,
  Status,
} from "hassu-common/graphql/apiModel";
import { suunnitelmanTilat } from "hassu-common/generated/kasittelynTila";

export type LocalizedMap<T> = { [key in Kieli]?: T } | null;
export type RequiredLocalizedMap<T> = {
  [Kieli.SUOMI]: T;
  [Kieli.RUOTSI]?: T;
};

export enum SaameKieli {
  POHJOISSAAME = "POHJOISSAAME",
}

export enum SuomiRuotsiKieli {
  SUOMI = "SUOMI",
  RUOTSI = "RUOTSI",
}

export type SaameLocalizedMap<T> = { [key in SaameKieli]?: T } | null;

export type Kielitiedot = {
  ensisijainenKieli: Kieli;
  toissijainenKieli?: Kieli | null;
  projektinNimiVieraskielella?: string;
};

export type Yhteystieto = {
  etunimi: string;
  sukunimi: string;
  organisaatio?: string;
  kunta?: number | null;
  elyOrganisaatio?: ELY;
  evkOrganisaatio?: Elinvoimakeskus;
  puhelinnumero: string;
  sahkoposti: string;
  titteli?: string;
};

export type Aineisto = {
  // Dokumentin oid Velhossa
  dokumenttiOid: string;
  // Kategorian ID, joka viittaa kategoriapuun kategoriaan
  kategoriaId?: string;
  // Suhteellinen polku tiedostoon yllapidon S3-bucketissa projektin alla
  tiedosto?: string;
  // Tiedostonimi naytettavaksi
  nimi: string;
  // Tunniste, joka on luotu FE:ssä, kun tiedosto on valittu. Ei muutu.
  uuid: string;
  // Jos tosi, tallennuksen validoinnissa ja tallennuksessa käytetään tunnisteena uuid:n sijaa dokumenttiOid:ta
  // HUOM! tätä tietoa ei ole oikeasti tarkoitus tallentaa kantaan
  uuidGeneratedBySchemaMigration?: boolean;
  // Aikaleima, milloin tiedosto on tuotu jarjestelmaan yyyy-MM-ddTHH:mm
  tuotu?: string;
  // Numero jarjestamista varten
  jarjestys?: number | null;
  tila: AineistoTila;
  kategoriaMuuttunut?: boolean;
};

export type AineistoNew = ILadattuTiedosto & {
  // Dokumentin oid Velhossa
  dokumenttiOid: string;
  // Kategorian ID, joka viittaa kategoriapuun kategoriaan
  kategoriaId?: string;
};

export type StandardiYhteystiedot = {
  yhteysTiedot?: Yhteystieto[];
  yhteysHenkilot?: string[];
};

export type IlmoituksenVastaanottajat = {
  kunnat?: Array<KuntaVastaanottaja> | null;
  viranomaiset?: Array<ViranomaisVastaanottaja> | null;
  maakunnat?: Array<MaakuntaVastaanottaja> | null;
};

export type SahkopostiVastaanottaja = {
  sahkoposti: string;
  messageId?: string;
  lahetetty?: string | null;
  lahetysvirhe?: boolean | null;
};

export type KuntaVastaanottaja = {
  id: number;
} & SahkopostiVastaanottaja;

export type MaakuntaVastaanottaja = {
  id: number;
} & SahkopostiVastaanottaja;

export type ViranomaisVastaanottaja = {
  nimi: IlmoitettavaViranomainen;
} & SahkopostiVastaanottaja;

export type UudelleenKuulutus = {
  tila: UudelleenkuulutusTila;
  selosteKuulutukselle?: RequiredLocalizedMap<string>;
  selosteLahetekirjeeseen?: RequiredLocalizedMap<string>;
  alkuperainenHyvaksymisPaiva?: string;
  tiedotaKiinteistonomistajia?: boolean;
  alkuperainenKuulutusPaiva?: string;
};

export type AineistoMuokkaus = {
  alkuperainenHyvaksymisPaiva?: string;
};

export enum UudelleenkuulutusTila {
  PERUUTETTU = "PERUUTETTU",
  JULKAISTU_PERUUTETTU = "JULKAISTU_PERUUTETTU",
}

export type LinkitettyVelhoProjekti = {
  oid: string;
  nimi: string;
  tyyppi?: ProjektiTyyppi | null;
};

export type Velho = {
  nimi: string;
  tyyppi?: ProjektiTyyppi | null;
  kuvaus?: string | null;
  vaylamuoto?: string[] | null;
  asiatunnusVayla?: string | null;
  asiatunnusELY?: string | null;
  asiatunnusEVK?: string | null;
  suunnittelustaVastaavaViranomainen?: SuunnittelustaVastaavaViranomainen | null;
  toteuttavaOrganisaatio?: string | null;
  vastuuhenkilonNimi?: string | null;
  vastuuhenkilonEmail?: string | null;
  varahenkilonNimi?: string | null;
  varahenkilonEmail?: string | null;
  maakunnat?: number[] | null;
  kunnat?: number[] | null;
  linkki?: string | null;
  linkitetytProjektit?: LinkitettyVelhoProjekti[] | null;
  geoJSON?: string | null;
};
export interface ILadattuTiedosto {
  // Kayttajalle esitettava tiedostonimi
  nimi: string;
  uuid: string;
  lisatty: string;
}

export type LadattuTiedostoNew = ILadattuTiedosto;

export type LadattuTiedosto = {
  // Suhteellinen polku tiedostoon yllapidon S3-bucketissa projektin alla
  tiedosto: string;
  // Kayttajalle esitettava tiedostonimi
  nimi?: string | null;
  uuid: string;
  tuotu?: string | null;
  //Numero jarjestamista varten
  jarjestys?: number;
  tila: LadattuTiedostoTila;
};

export type KunnallinenLadattuTiedosto = {
  kunta: number;
} & ILadattuTiedosto;

export type Laskutustiedot = {
  ovtTunnus?: string | null;
  verkkolaskuoperaattorinTunnus?: string | null;
  viitetieto?: string | null;
};

export type DBVaylaUser = {
  email: string;
  kayttajatunnus: string;
  puhelinnumero?: string;
  organisaatio: string;
  etunimi: string;
  sukunimi: string;
  tyyppi?: KayttajaTyyppi | null;
  muokattavissa?: boolean;
  yleinenYhteystieto?: boolean;
  elyOrganisaatio?: ELY;
  evkOrganisaatio?: Elinvoimakeskus;
};

export type KuulutusSaamePDFt = SaameLocalizedMap<KuulutusSaamePDF>;

export type KuulutusSaamePDF = {
  kuulutusPDF?: LadattuTiedosto | null;
  kuulutusIlmoitusPDF?: LadattuTiedosto | null;
  kirjeTiedotettavillePDF?: LadattuTiedosto | null;
};

export type SuunnitteluSopimus = {
  kunta?: number | null;
  logo?: LocalizedMap<string> | null;
  yhteysHenkilo?: string | null;
  osapuolet?: SuunnitteluSopimusOsapuoli[] | null;
};

export type SuunnitteluSopimusJulkaisu = {
  kunta?: number | null;
  logo?: LocalizedMap<string> | null;
  etunimi?: string | null;
  sukunimi?: string | null;
  puhelinnumero?: string | null;
  email?: string | null;
  osapuolet?: SuunnitteluSopimusOsapuoli[] | null;
};

export type SuunnitteluSopimusOsapuoli = {
  osapuolenNimiFI?: string | null;
  osapuolenNimiSV?: string | null;
  osapuolenHenkilot?: OsapuolenHenkilo[] | null;
  osapuolenTyyppi?: string | null;
  osapuolenLogo?: LocalizedMap<string> | null;
};

export type OsapuolenHenkilo = {
  etunimi?: string | null;
  sukunimi?: string | null;
  puhelinnumero?: string | null;
  email?: string | null;
  yritys?: string | null;
  kunta?: string | null;
  valittu?: boolean;
};

export type Suunnitelma = {
  asiatunnus: string;
  nimi: string;
};

export type KasittelynTila = {
  suunnitelmanTila?: keyof typeof suunnitelmanTilat; // Esimerkiksi "suunnitelman-tila/sutil01"
  hyvaksymisesitysTraficomiinPaiva?: string;
  ennakkoneuvotteluPaiva?: string;
  hyvaksymispaatos?: Hyvaksymispaatos;
  ensimmainenJatkopaatos?: Hyvaksymispaatos;
  toinenJatkopaatos?: Hyvaksymispaatos;
  valitustenMaara?: number;
  lainvoimaAlkaen?: string;
  lainvoimaPaattyen?: string;
  liikenteeseenluovutusOsittain?: string;
  liikenteeseenluovutusKokonaan?: string;
  hallintoOikeus?: OikeudenPaatos;
  korkeinHallintoOikeus?: OikeudenPaatos;
  lisatieto?: string;
  ennakkotarkastus?: string;
  toimitusKaynnistynyt?: string;
  toteutusilmoitusOsittain?: string;
  toteutusilmoitusKokonaan?: string;
  suunnitelmaRauennut?: string;
  tieRatasuunnitelmaLuotu?: boolean;
  laaditunSuunnitelmanLisatiedot?: string;
};

export type OikeudenPaatos = {
  valipaatos?: Paatos;
  paatos?: Paatos;
  hyvaksymisPaatosKumottu: boolean;
};

export type Paatos = {
  paiva?: string;
  sisalto?: string;
};

export type Hyvaksymispaatos = {
  paatoksenPvm?: string | null;
  asianumero?: string;
  aktiivinen?: boolean;
};

export type ProjektinJakautuminen = {
  jaettuProjekteihin?: string[];
  jaettuProjektista?: string;
};

export type DBEnnakkoNeuvottelu = {
  poistumisPaiva?: string | null;
  lisatiedot?: string | null;
  hyvaksymisEsitys?: Array<LadattuTiedostoNew> | null;
  suunnitelma?: Array<AineistoNew> | null;
  muistutukset?: Array<KunnallinenLadattuTiedosto> | null;
  lausunnot?: Array<LadattuTiedostoNew> | null;
  kuulutuksetJaKutsu?: Array<LadattuTiedostoNew> | null;
  muuAineistoVelhosta?: Array<AineistoNew> | null;
  muuAineistoKoneelta?: Array<LadattuTiedostoNew> | null;
  linkitetynProjektinAineisto?: Array<AineistoNew> | null;
  maanomistajaluettelo?: Array<LadattuTiedostoNew> | null;
  vastaanottajat?: Array<SahkopostiVastaanottaja> | null;
  muokkaaja?: string | null;
  poisValitutKuulutuksetJaKutsu?: string[];
  poisValitutMaanomistajaluettelot?: string[];
};

export type DBEnnakkoNeuvotteluJulkaisu = DBEnnakkoNeuvottelu & { lahetetty: string; poistumisPaiva: string };

export type OmistajaHaku = {
  virhe?: boolean | null;
  kaynnistetty?: string | null;
  kiinteistotunnusMaara?: number | null;
  status?: Status | null;
};

export type Asianhallinta = {
  inaktiivinen?: boolean;
  asiaId?: number;
};
