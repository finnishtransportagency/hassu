import { ProjektiRooli, Status } from "../../../../common/graphql/apiModel";

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
  muistiinpano?: string | null;
  vaylamuoto?: string[];
  vaihe?: string | null;
  tila?: string | null;
  asianumero?: string | null;
  tyyppi?: string | null;
  status?: Status | null;
  organisaatio?: string | null;
  toteutusAjankohta?: string | null;
  // false, jos projekti ladattiin Velhosta, mutta ei ole vielä tallennettu tietokantaan
  tallennettu?: boolean;
  kayttoOikeudet: DBVaylaUser[];
};
