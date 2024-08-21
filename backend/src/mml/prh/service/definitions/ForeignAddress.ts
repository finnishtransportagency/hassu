import { Source } from "./Source";
import { Validity } from "./Validity";

/**
 * ForeignAddress
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface ForeignAddress {
    /** xs:string */
    AddressPart1?: string;
    /** xs:string */
    AddressPart2?: string;
    /** xs:string */
    AddressPart3?: string;
    /** xs:string */
    City?: string;
    /** Country */
    Country?: Source;
    /** Type */
    Type?: Source;
    /** Validity */
    Validity?: Validity;
}
