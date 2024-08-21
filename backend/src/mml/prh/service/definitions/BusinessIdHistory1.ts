import { Source } from "./Source";

/**
 * BusinessIdHistory
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface BusinessIdHistory1 {
    /** xs:string */
    OldBusinessId?: string;
    /** xs:string */
    NewBusinessId?: string;
    /** xs:dateTime */
    ChangeDate?: Date;
    /** Change */
    Change?: Source;
    /** Source */
    Source?: Source;
}
