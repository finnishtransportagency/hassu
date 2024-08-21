import { Descriptions } from "./Descriptions";

/**
 * Source
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface Source {
    /** xs:string */
    PrimaryCode?: string;
    /** xs:string */
    SecondaryCode?: string;
    /** Descriptions */
    Descriptions?: Descriptions;
}
