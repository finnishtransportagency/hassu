import { CompanyQuery } from "./CompanyQuery";

/**
 * request
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface Request {
    /** companyQuery */
    companyQuery?: CompanyQuery;
}
