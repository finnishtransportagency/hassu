import { Asiakas } from "./Asiakas";
import { Viittaus } from "./Viittaus";
import { Tila } from "./Tila";
import { Tiedostot } from "./Tiedostot";

/**
 * Kohde
 * @targetNSAlias `tns`
 * @targetNamespace `http://www.suomi.fi/asiointitili`
 */
export interface Kohde {
    /** Asiakas[] */
    Asiakas?: Array<Asiakas>;
    /** xsd:string */
    ViranomaisTunniste?: string;
    /** Viittaus */
    Viittaus?: Viittaus;
    /** xsd:int */
    VahvistusVaatimus?: string;
    /** xsd:int */
    VaadiLukukuittaus?: string;
    /** xsd:string */
    AsiaNumero?: string;
    /** xsd:string */
    Nimeke?: string;
    /** xsd:dateTime */
    LahetysPvm?: string;
    /** xsd:string */
    LahettajaNimi?: string;
    /** xsd:string */
    KuvausTeksti?: string;
    /** Tila */
    Tila?: Tila;
    /** Tiedostot */
    Tiedostot?: Tiedostot;
    /** xsd:string */
    ViranomaisenEmail?: string;
    /** xsd:string */
    EmailLisatietoOtsikko?: string;
    /** xsd:string */
    EmailLisatietoSisalto?: string;
    /** xsd:string */
    TavoitettavuusTietoEmail?: string;
    /** xsd:int */
    Viestityyppi?: string;
    /** xsd:boolean */
    LisaaOsoitesivu?: string;
    /** xsd:boolean */
    SalliLiitteenKiertoPystyyn?: string;
}
