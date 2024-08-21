import { Source } from "./Source";
import { Validity } from "./Validity";

/**
 * RegistryEntry
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface RegistryEntry {
    /** Registry */
    Registry?: Source;
    /** RegistryCode */
    RegistryCode?: Source;
    /** Authority */
    Authority?: Source;
    /** xs:dateTime */
    RegistrationDate?: Date;
    /** Validity */
    Validity?: Validity;
}
