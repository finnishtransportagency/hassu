import { AsiakasAttributes } from "./Asiakas";

/**
 * Asiakas
 * @targetNSAlias `tns`
 * @targetNamespace `http://www.suomi.fi/asiointitili`
 */
export interface Asiakas2 {
  /** xsd:string */
  AsiointitiliTunniste?: string;
  /** xsd:int */
  KohteenTila?: number;
  /** xsd:string */
  KohteenTilaKuvaus?: string;
  attributes: AsiakasAttributes;
}
