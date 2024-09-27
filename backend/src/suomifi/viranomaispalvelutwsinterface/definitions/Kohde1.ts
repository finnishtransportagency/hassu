import { Asiakas2 } from "./Asiakas2";

/**
 * Kohde
 * @targetNSAlias `tns`
 * @targetNamespace `http://www.suomi.fi/asiointitili`
 */
export interface Kohde1 {
  /** xsd:string */
  ViranomaisTunniste?: string;
  /** Asiakas[] */
  Asiakas?: Array<Asiakas2>;
}
