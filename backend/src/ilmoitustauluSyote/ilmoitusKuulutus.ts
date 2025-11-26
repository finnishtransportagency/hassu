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
  kunnat?: number[];
  maakunnat?: number[];
  vaylamuoto?: string[];
  date: string;
  elyt?: string[];
  lelyt?: string[];
  elinvoimakeskukset?: string[];
};
