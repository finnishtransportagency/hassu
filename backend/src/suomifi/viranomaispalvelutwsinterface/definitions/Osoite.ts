/**
 * Osoite
 * @targetNSAlias `tns`
 * @targetNamespace `http://www.suomi.fi/asiointitili`
 */
export interface Osoite {
  /** xsd:string */
  Nimi?: string;
  /** xsd:string */
  Lahiosoite?: string;
  /** xsd:string */
  Postinumero?: string;
  /** xsd:string */
  Postitoimipaikka?: string;
  /** xsd:string */
  Maa?: string;
}
