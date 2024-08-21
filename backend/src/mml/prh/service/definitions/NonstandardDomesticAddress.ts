import { Source } from "./Source";
import { Validity } from "./Validity";

/**
 * NonstandardDomesticAddress
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface NonstandardDomesticAddress {
    /** xs:string */
    AddressPart1?: string;
    /** xs:string */
    AddressPart2?: string;
    /** xs:string */
    AddressPart3?: string;
    /** xs:string */
    AddressPart4?: string;
    /** xs:string */
    PostalCode?: string;
    /** xs:string */
    City?: string;
    /** Language */
    Language?: Source;
    /** Type */
    Type?: Source;
    /** xs:boolean */
    PostalCodeActive?: boolean;
    /** Validity */
    Validity?: Validity;
}
