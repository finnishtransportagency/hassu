import { AsiakasAttributes } from "./Asiakas";

/**
 * Asiakas
 * @targetNSAlias `tns`
 * @targetNamespace `http://www.suomi.fi/asiointitili`
 */
export interface Asiakas1 {
  /** xsd:int */
  Tila?: number;
  /** xsd:dateTime */
  TilaPvm?: string;
  /** xsd:int */
  TiliPassivoitu?: string;
  attributes: AsiakasAttributes;
}
