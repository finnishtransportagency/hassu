import { Validity } from "./Validity";
import { Source } from "./Source";

/**
 * TradeName
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface TradeName {
    /** xs:string */
    Name?: string;
    /** Validity */
    Validity?: Validity;
    /** Source */
    Source?: Source;
    /** Type */
    Type?: Source;
}
