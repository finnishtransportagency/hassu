import { Person } from "./Person";
import { TradeName } from "./TradeName";
import { AuxiliaryTradeNames } from "./AuxiliaryTradeNames";
import { Bankruptcy } from "./Bankruptcy";
import { CompanyStatus } from "./CompanyStatus";
import { PostalAddress } from "./PostalAddress";
import { ContactDetails } from "./ContactDetails";
import { RegistrationsInForce } from "./RegistrationsInForce";
import { BusinessIdHistory } from "./BusinessIdHistory";

/**
 * Company
 * @targetNSAlias `tns`
 * @targetNamespace `http://bis/dataservices/companyquery/v1`
 */
export interface Company {
    /** xs:string */
    BusinessId?: string;
    /** Person */
    Person?: Person;
    /** TradeName */
    TradeName?: TradeName;
    /** AuxiliaryTradeNames */
    AuxiliaryTradeNames?: AuxiliaryTradeNames;
    /** ParallelTradeNames */
    ParallelTradeNames?: AuxiliaryTradeNames;
    /** Bankruptcy */
    Bankruptcy?: Bankruptcy;
    /** CompanyReorganisation */
    CompanyReorganisation?: Bankruptcy;
    /** Liquidation */
    Liquidation?: Bankruptcy;
    /** BusinessInterruption */
    BusinessInterruption?: Bankruptcy;
    /** LegalForm */
    LegalForm?: Bankruptcy;
    /** Municipality */
    Municipality?: Bankruptcy;
    /** BusinessLine */
    BusinessLine?: Bankruptcy;
    /** Language */
    Language?: Bankruptcy;
    /** BusinessActivity */
    BusinessActivity?: Bankruptcy;
    /** CompanyStatus */
    CompanyStatus?: CompanyStatus;
    /** PostalAddress */
    PostalAddress?: PostalAddress;
    /** StreetAddress */
    StreetAddress?: PostalAddress;
    /** ContactDetails */
    ContactDetails?: ContactDetails;
    /** RegistrationsInForce */
    RegistrationsInForce?: RegistrationsInForce;
    /** RegistrationHistory */
    RegistrationHistory?: RegistrationsInForce;
    /** xs:boolean */
    RegisteredInPrepaymentRegister?: boolean;
    /** xs:dateTime */
    NextRevisionDateOfPrepaymentRegister?: Date;
    /** BusinessIdHistory */
    BusinessIdHistory?: BusinessIdHistory;
    /** InDebtAdjustment */
    InDebtAdjustment?: Bankruptcy;
}
