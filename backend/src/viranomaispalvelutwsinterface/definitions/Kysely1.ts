import { Kohteet } from "./Kohteet";

/**
 * Kysely
 * @targetNSAlias `tns`
 * @targetNamespace `http://www.suomi.fi/asiointitili`
 */
export interface Kysely1 {
    /** xsd:int */
    KohdeMaara?: string;
    /** Kohteet */
    Kohteet?: Kohteet;
}
