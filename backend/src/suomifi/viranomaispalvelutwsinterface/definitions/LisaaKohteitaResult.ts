import { TilaKoodi } from "./TilaKoodi";
import { Kohteet1 } from "./Kohteet1";

/**
 * LisaaKohteitaResult
 * @targetNSAlias `tns`
 * @targetNamespace `http://www.suomi.fi/asiointitili`
 */
export interface LisaaKohteitaResult {
    /** TilaKoodi */
    TilaKoodi?: TilaKoodi;
    /** xsd:int */
    KohdeMaara?: string;
    /** Kohteet */
    Kohteet?: Kohteet1;
}
