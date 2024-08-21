import { Validity } from "./Validity";
import { Source } from "./Source";

/**
 * ContactDetail
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface ContactDetail {
    /** xs:string */
    Value?: string;
    /** Validity */
    Validity?: Validity;
    /** Type */
    Type?: Source;
}
