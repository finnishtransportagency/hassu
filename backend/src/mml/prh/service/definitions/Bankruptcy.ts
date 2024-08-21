import { Validity } from "./Validity";
import { Source } from "./Source";

/**
 * Bankruptcy
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface Bankruptcy {
    /** xs:boolean */
    CodeActive?: boolean;
    /** Validity */
    Validity?: Validity;
    /** Source */
    Source?: Source;
    /** Type */
    Type?: Source;
}
