import { Validity } from "./Validity";
import { Source } from "./Source";

/**
 * CompanyStatus
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface CompanyStatus {
    /** Validity */
    Validity?: Validity;
    /** BusinessIdStatus */
    BusinessIdStatus?: Source;
    /** Status */
    Status?: Source;
}
