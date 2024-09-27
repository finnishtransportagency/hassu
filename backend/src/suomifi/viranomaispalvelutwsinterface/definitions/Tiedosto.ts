/**
 * Tiedosto
 * @targetNSAlias `tns`
 * @targetNamespace `http://www.suomi.fi/asiointitili`
 */
export interface Tiedosto {
  /** xsd:string */
  TiedostonKuvaus?: string;
  /** xsd:string */
  TiedostoURL?: string;
  /** xsd:base64Binary */
  TiedostoSisalto?: string;
  /** xsd:string */
  TiedostoID?: string;
  /** xsd:string */
  TiedostoKoko?: string;
  /** xsd:string */
  TiedostoMuoto?: string;
  /** xsd:string */
  TiedostoNimi?: string;
}
