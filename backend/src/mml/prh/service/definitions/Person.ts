import { Validity } from "./Validity";
import { Source } from "./Source";

/**
 * Person
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface Person {
    /** xs:string */
    Name?: string;
    /** Validity */
    Validity?: Validity;
    /** Source */
    Source?: Source;
}
