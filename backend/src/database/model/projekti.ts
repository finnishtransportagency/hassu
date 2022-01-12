import { ProjektiRooli, ProjektiTyyppi, Status, Viranomainen, Yhteystieto } from "../../../../common/graphql/apiModel";

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
  esitettavatYhteystiedot?: (Yhteystieto | null)[] | null;
};

export type SuunnitteluSopimus = {
  kunta: string;
  logo?: string;
  etunimi: string;
  sukunimi: string;
  puhelinnumero: string;
  email: string;
};

export type Velho = {
  nimi: string;
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
  tyyppi?: ProjektiTyyppi | null;
  status?: Status | null;
  suunnittelustaVastaavaViranomainen?: Viranomainen | null;
  lisakuulutuskieli?: string | null;
  eurahoitus?: string | null;
  aloitusKuulutus?: AloitusKuulutus | null;
  suunnitteluSopimus?: SuunnitteluSopimus | null;
  velho?: Velho | null;

  // false, jos projekti ladattiin Velhosta, mutta ei ole vielä tallennettu tietokantaan
  tallennettu?: boolean;
  kayttoOikeudet: DBVaylaUser[];
};
