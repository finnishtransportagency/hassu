export enum Status {
  EI_JULKAISTU = "EI_JULKAISTU",
  ALOITUSKUULUTUS = "ALOITUSKUULUTUS",
  SUUNNITTELU = "SUUNNITTELU",
  NAHTAVILLAOLO = "NAHTAVILLAOLO",
  HYVAKSYMISPAATOS = "HYVAKSYMISPAATOS",
  LAINVOIMA = "LAINVOIMA",
  ARKISTOITU = "ARKISTOITU",
}

export type Suunnitelma = {
  __typename: "Suunnitelma";
  id: string;
  name: string;
  location?: string | null;
  type?: string | null;
  contact?: string | null;
  status?: Status | null;
};
