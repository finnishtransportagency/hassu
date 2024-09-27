import { Kohteet2 } from "./Kohteet2";
import { Laskutus } from "./Laskutus";

/**
 * Kysely
 * @targetNSAlias `tns`
 * @targetNamespace `http://www.suomi.fi/asiointitili`
 */
export interface Kysely3 {
  /** xsd:boolean */
  Paperi?: string;
  /** Kohteet */
  Kohteet?: Kohteet2;
  /** xsd:string */
  Tulostustoimittaja?: string;
  /** xsd:boolean */
  LahetaTulostukseen?: string;
  /** Laskutus */
  Laskutus?: Laskutus;
  /** xsd:boolean */
  Varitulostus?: string;
}
