import { Source } from "./Source";

/**
 * TaxDebt
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface TaxDebt {
    /** xs:dateTime */
    LastUpdate?: Date;
    /** xs:decimal */
    TaxesOwedSum?: number;
    /** TaxesOwed */
    TaxesOwed?: Source;
    /** NegligenceInFillingTaxReturns */
    NegligenceInFillingTaxReturns?: Source;
}
