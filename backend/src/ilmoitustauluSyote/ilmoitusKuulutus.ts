export enum IlmoitusKuulutusType {
  ILMOITUS = "Ilmoitus",
  KUULUTUS = "Kuulutus",
}

export type IlmoitusKuulutus = {
  key: string;
  oid: string;
  title: string;
  kieli: string;
  url: string;
  type: IlmoitusKuulutusType;
  kunnat?: string[];
  maakunnat?: string[];
  vaylamuoto?: string[];
  date: string;
};
