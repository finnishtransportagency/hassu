import { Asiakkaat } from "./Asiakkaat";

/**
 * Kysely
 * @targetNSAlias `tns`
 * @targetNamespace `http://www.suomi.fi/asiointitili`
 */
export interface Kysely {
  /** xsd:string */
  KyselyLaji?: string;
  /** xsd:dateTime */
  KyselyAlku?: string;
  /** xsd:dateTime */
  KyselyLoppu?: string;
  /** Asiakkaat */
  Asiakkaat?: Asiakkaat;
}
