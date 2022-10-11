import { AineistoTila, Kieli, IlmoitettavaViranomainen, Viranomainen, ProjektiTyyppi } from "../../../../common/graphql/apiModel";

export type LocalizedMap<T> = { [key in Kieli]?: T } | null;

export type Kielitiedot = {
  ensisijainenKieli: Kieli;
  toissijainenKieli?: Kieli;
  projektinNimiVieraskielella?: string;
};

export type Yhteystieto = {
  etunimi: string;
  sukunimi: string;
  organisaatio: string;
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
  // Aikaleima, milloin tiedosto on tuotu jarjestelmaan yyyy-MM-ddTHH:mm
  tuotu?: string;
  // Numero jarjestamista varten
  jarjestys?: number | null;
  tila: AineistoTila;
};

export type StandardiYhteystiedot = {
  yhteysTiedot?: Yhteystieto[];
  yhteysHenkilot?: string[];
};

export type IlmoituksenVastaanottajat = {
  kunnat?: Array<KuntaVastaanottaja> | null;
  viranomaiset?: Array<ViranomaisVastaanottaja> | null;
};

export type KuntaVastaanottaja = {
  nimi: string;
  sahkoposti: string;
  lahetetty?: string | null;
};

export type ViranomaisVastaanottaja = {
  nimi: IlmoitettavaViranomainen;
  sahkoposti: string;
  lahetetty?: string | null;
};

export type Velho = {
  nimi: string;
  tyyppi?: ProjektiTyyppi | null;
  kuvaus?: string | null;
  vaylamuoto?: string[] | null;
  asiatunnusVayla?: string | null;
  asiatunnusELY?: string | null;
  suunnittelustaVastaavaViranomainen?: Viranomainen | null;
  toteuttavaOrganisaatio?: string | null;
  vastuuhenkilonNimi?: string | null;
  vastuuhenkilonEmail?: string | null;
  varahenkilonNimi?: string | null;
  varahenkilonEmail?: string | null;
  maakunnat?: string[] | null;
  kunnat?: string[] | null;
  linkki?: string | null;
};
