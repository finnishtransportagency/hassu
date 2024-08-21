import { BusinessIds } from "./BusinessIds";
import { TaxDebt } from "./TaxDebt";

/**
 * GetCompanyTaxDebtResult
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface GetCompanyTaxDebtResult {
    /** xs:string */
    BusinessId?: string;
    /** xs:string */
    TradeName?: string;
    /** AuxiliaryNames */
    AuxiliaryNames?: BusinessIds;
    /** TaxDebt */
    TaxDebt?: TaxDebt;
}
