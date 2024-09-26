import { Source } from "./Source";
import { CompanyStatus } from "./CompanyStatus";

/**
 * GetCompanyStatusResult
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface GetCompanyStatusResult {
    /** xs:string */
    BusinessId?: string;
    /** LegalForm */
    LegalForm?: Source;
    /** CompanyStatus */
    CompanyStatus?: CompanyStatus;
}
