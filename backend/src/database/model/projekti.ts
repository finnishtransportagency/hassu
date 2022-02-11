import { AloitusKuulutusTila, Kieli, ProjektiRooli, ProjektiTyyppi, Viranomainen } from "../../../../common/graphql/apiModel";

export type Kuulutus = {
  kuulutusPaiva?: string;
  siirtyySuunnitteluVaiheeseen?: string;
  hankkeenKuvaus?: string;
  hankkeenKuvausRuotsi?: string;
  hankkeenKuvausSaame?: string;
  elyKeskus?: string;
  yhteystiedot?: string[];
};

export type DBVaylaUser = {
  rooli: ProjektiRooli;
  email: string;
  kayttajatunnus: string;

  puhelinnumero: string;
  organisaatio: string;
  nimi: string;
  esitetaanKuulutuksessa?: boolean | null;
};

export type AloitusKuulutus = {
  kuulutusPaiva?: string | null;
  siirtyySuunnitteluVaiheeseen?: string | null;
  hankkeenKuvaus?: string | null;
  hankkeenKuvausRuotsi?: string | null;
  hankkeenKuvausSaame?: string | null;
  elyKeskus?: string | null;
  esitettavatYhteystiedot?: Yhteystieto[] | null;
};

export type AloitusKuulutusJulkaisu = {
  kuulutusPaiva?: string | null;
  siirtyySuunnitteluVaiheeseen?: string | null;
  hankkeenKuvaus?: string | null;
  hankkeenKuvausRuotsi?: string | null;
  hankkeenKuvausSaame?: string | null;
  elyKeskus?: string | null;
  yhteystiedot: Yhteystieto[];
  velho: Velho;
  suunnitteluSopimus?: SuunnitteluSopimus | null;
  tila?: AloitusKuulutusTila | null;
};

export type Yhteystieto = {
  etunimi: string;
  sukunimi: string;
  organisaatio: string;
  puhelinnumero: string;
  sahkoposti: string;
};

export type SuunnitteluSopimus = {
  kunta: string;
  logo?: string;
  etunimi: string;
  sukunimi: string;
  puhelinnumero: string;
  email: string;
};

export type Suunnitelma = {
  asiatunnus: string;
  nimi: string;
};

export type Kielitiedot = {
  ensisijainenKieli: Kieli;
  toissijainenKieli?: Kieli;
  projektinNimiVieraskielella?: string;
};

export type Velho = {
  nimi: string;
  tyyppi?: ProjektiTyyppi | null;
  kuvaus?: string | null;
  vaylamuoto?: string[] | null;
  asiatunnusVayla?: string | null;
  asiatunnusELY?: string | null;
  tilaajaOrganisaatio?: string | null;
  toteuttavaOrganisaatio?: string | null;
  vastuuhenkilonNimi?: string | null;
  vastuuhenkilonEmail?: string | null;
  varahenkiloNimi?: string | null;
  varahenkiloEmail?: string | null;
  maakunnat?: string[] | null;
  kunnat?: string[] | null;
  linkki?: string | null;
};

export type DBProjekti = {
  oid: string;
  muistiinpano?: string | null;
  vaihe?: string | null;
  /**
   * @deprecated velho.tyyppi is the correct one
   */
  tyyppi?: ProjektiTyyppi | null;
  suunnittelustaVastaavaViranomainen?: Viranomainen | null;
  kielitiedot?: Kielitiedot | null;
  euRahoitus?: boolean | null;
  aloitusKuulutus?: AloitusKuulutus | null;
  aloitusKuulutusJulkaisut?: AloitusKuulutusJulkaisu[] | null;
  suunnitteluSopimus?: SuunnitteluSopimus | null;
  velho?: Velho | null;
  liittyvatSuunnitelmat?: Suunnitelma[] | null;

  // false, jos projekti ladattiin Velhosta, mutta ei ole vielä tallennettu tietokantaan
  tallennettu?: boolean;
  kayttoOikeudet: DBVaylaUser[];
};
