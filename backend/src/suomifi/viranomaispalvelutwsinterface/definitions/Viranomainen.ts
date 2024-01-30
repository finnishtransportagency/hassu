import { Yhteyshenkilo } from "./Yhteyshenkilo";
import { Osoite } from "./Osoite";

/**
 * Viranomainen
 * @targetNSAlias `tns`
 * @targetNamespace `http://www.suomi.fi/asiointitili`
 */
export interface Viranomainen {
    /** xsd:string */
    ViranomaisTunnus?: string;
    /** xsd:string */
    PalveluTunnus?: string;
    /** xsd:string */
    KayttajaTunnus?: string;
    /** Yhteyshenkilo */
    Yhteyshenkilo?: Yhteyshenkilo;
    /** Osoite */
    Osoite?: Osoite;
    /** xsd:string */
    SanomaTunniste?: string;
    /** xsd:string */
    SanomaVersio?: string;
    /** xsd:string */
    SanomaVarmenneNimi?: string;
}
