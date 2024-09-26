import { Source } from "./Source";
import { Validity } from "./Validity";

/**
 * DomesticAddress
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface DomesticAddress {
    /** xs:string */
    CareOf?: string;
    /** xs:string */
    Street?: string;
    /** xs:string */
    PostOfficeBox?: string;
    /** xs:string */
    BuildingNumber?: string;
    /** xs:string */
    Entrance?: string;
    /** xs:string */
    ApartmentNumber?: string;
    /** xs:string */
    ApartmentIDSuffix?: string;
    /** xs:string */
    PostalCode?: string;
    /** xs:string */
    City?: string;
    /** Language */
    Language?: Source;
    /** Type */
    Type?: Source;
    /** xs:boolean */
    PostalCodeActive?: boolean;
    /** Validity */
    Validity?: Validity;
}
