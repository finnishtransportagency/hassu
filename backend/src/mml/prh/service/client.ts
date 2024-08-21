import { Client as SoapClient, createClientAsync as soapCreateClientAsync, IExOptions as ISoapExOptions } from "soap";
import { GetCompany } from "./definitions/GetCompany";
import { GetCompanyResponse } from "./definitions/GetCompanyResponse";
import { GetCompanies } from "./definitions/GetCompanies";
import { GetCompaniesResponse } from "./definitions/GetCompaniesResponse";
import { GetCompanyStatus } from "./definitions/GetCompanyStatus";
import { GetCompanyStatusResponse } from "./definitions/GetCompanyStatusResponse";
import { SearchCompany } from "./definitions/SearchCompany";
import { SearchCompanyResponse } from "./definitions/SearchCompanyResponse";
import { GetUpdatedCompanies } from "./definitions/GetUpdatedCompanies";
import { GetUpdatedCompaniesResponse } from "./definitions/GetUpdatedCompaniesResponse";
import { GetCompanyTaxDebt } from "./definitions/GetCompanyTaxDebt";
import { GetCompanyTaxDebtResponse } from "./definitions/GetCompanyTaxDebtResponse";
import { CompanyQueryService } from "./services/CompanyQueryService";

export interface ServiceClient extends SoapClient {
    CompanyQueryService: CompanyQueryService;
    GetCompanyAsync(getCompany: GetCompany, options?: ISoapExOptions): Promise<[result: GetCompanyResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    GetCompaniesAsync(getCompanies: GetCompanies, options?: ISoapExOptions): Promise<[result: GetCompaniesResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    GetCompanyStatusAsync(getCompanyStatus: GetCompanyStatus, options?: ISoapExOptions): Promise<[result: GetCompanyStatusResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    SearchCompanyAsync(searchCompany: SearchCompany, options?: ISoapExOptions): Promise<[result: SearchCompanyResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    GetUpdatedCompaniesAsync(getUpdatedCompanies: GetUpdatedCompanies, options?: ISoapExOptions): Promise<[result: GetUpdatedCompaniesResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
    GetCompanyTaxDebtAsync(getCompanyTaxDebt: GetCompanyTaxDebt, options?: ISoapExOptions): Promise<[result: GetCompanyTaxDebtResponse, rawResponse: any, soapHeader: any, rawRequest: any]>;
}

/** Create ServiceClient */
export function createClientAsync(...args: Parameters<typeof soapCreateClientAsync>): Promise<ServiceClient> {
    return soapCreateClientAsync(args[0], args[1], args[2]) as any;
}
