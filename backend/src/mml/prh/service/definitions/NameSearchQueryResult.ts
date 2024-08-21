import { Source } from "./Source";

/**
 * NameSearchQueryResult
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface NameSearchQueryResult {
    /** xs:string */
    BusinessId?: string;
    /** xs:string */
    Name?: string;
    /** LegalForm */
    LegalForm?: Source;
}
