import {
  AineistoTila,
  ELY,
  EVK,
  IlmoitettavaViranomainen,
  Kieli,
  ProjektiTyyppi,
  SuunnittelustaVastaavaViranomainen,
  LadattuTiedostoTila,
} from "hassu-common/graphql/apiModel";

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
  evkOrganisaatio?: EVK;
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
