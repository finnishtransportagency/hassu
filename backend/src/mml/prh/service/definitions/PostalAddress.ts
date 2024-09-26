import { ForeignAddress } from "./ForeignAddress";
import { DomesticAddress } from "./DomesticAddress";
import { NonstandardDomesticAddress } from "./NonstandardDomesticAddress";

/**
 * PostalAddress
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface PostalAddress {
    /** ForeignAddress */
    ForeignAddress?: ForeignAddress;
    /** DomesticAddress */
    DomesticAddress?: DomesticAddress;
    /** NonstandardDomesticAddress */
    NonstandardDomesticAddress?: NonstandardDomesticAddress;
}
