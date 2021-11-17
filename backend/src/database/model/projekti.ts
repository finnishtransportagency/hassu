import { ProjektiRooli, Status, Viranomainen } from "../../../../common/graphql/apiModel";

export type Kuulutus = {
  kuulutusPaiva?: string;
  siirtyySuunnitteluVaiheeseen?: string;
  hankkeenKuvaus?: string;
  hankkeenKuvausRuotsi?: string;
  hankkeenKuvausSaame?: string;
  elyKeskus?: string;
  yhteystiedot?: string[];
};

export type SuunnitteluSopimus = {
  kunta: string;
  etunimi: string;
  sukunimi: string;
  puhelinnumero: string;
  email: string;
};

export type DBVaylaUser = {
  rooli: ProjektiRooli;
  email: string;
  kayttajatunnus: string;

  puhelinnumero: string;
  organisaatio: string;
  nimi: string;
};

export type DBProjekti = {
  oid: string;
  nimi: string;
  muistiinpano?: string;
  vaylamuoto?: string[];
  vaihe?: string;
  tila?: string;
  asianumero?: string;
  tyyppi?: string;
  status?: Status;
  organisaatio?: string;
  toteutusAjankohta?: string;
  suunnittelustaVastaavaViranomainen?: Viranomainen;
  aloitusKuulutus?: {
    kuulutusPaiva?: string;
    siirtyySuunnitteluVaiheeseen?: string;
    hankkeenKuvaus?: string;
    hankkeenKuvausRuotsi?: string;
    hankkeenKuvausSaame?: string;
    elyKeskus?: string;
    yhteystiedot?: string[];
  };
  kunnat?: string[];
  maakunnat?: string[];
  EURahoitus?: boolean;
  suunnitteluSopimus?: {
    kunta: string;
    etunimi: string;
    sukunimi: string;
    puhelinnumero: string;
    email: string;
  };

  // false, jos projekti ladattiin Velhosta, mutta ei ole vielä tallennettu tietokantaan
  tallennettu?: boolean;
  kayttoOikeudet: DBVaylaUser[];
};
