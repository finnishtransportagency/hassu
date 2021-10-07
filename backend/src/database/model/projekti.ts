import { Status } from "../../api/apiModel";

export type DBProjekti = {
  oid: string;
  nimi?: string | null;
  vaylamuoto?: string[];
  vaihe?: string | null;
  tila?: string | null;
  asianumero?: string | null;
  tyyppi?: string | null;
  status?: Status | null;
  organisaatio?: string | null;
  toteutusAjankohta?: string | null;
  vastuuhenkilo?: string | null;
  // false, jos projekti ladattiin Velhosta, mutta ei ole vielä tallennettu tietokantaan
  tallennettu?: boolean;
};
