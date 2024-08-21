import { GetCompany } from "../definitions/GetCompany";
import { GetCompanyResponse } from "../definitions/GetCompanyResponse";
import { GetCompanies } from "../definitions/GetCompanies";
import { GetCompaniesResponse } from "../definitions/GetCompaniesResponse";
import { GetCompanyStatus } from "../definitions/GetCompanyStatus";
import { GetCompanyStatusResponse } from "../definitions/GetCompanyStatusResponse";
import { SearchCompany } from "../definitions/SearchCompany";
import { SearchCompanyResponse } from "../definitions/SearchCompanyResponse";
import { GetUpdatedCompanies } from "../definitions/GetUpdatedCompanies";
import { GetUpdatedCompaniesResponse } from "../definitions/GetUpdatedCompaniesResponse";
import { GetCompanyTaxDebt } from "../definitions/GetCompanyTaxDebt";
import { GetCompanyTaxDebtResponse } from "../definitions/GetCompanyTaxDebtResponse";

export interface CompanyQueryServiceEndpoint {
    GetCompany(getCompany: GetCompany, callback: (err: any, result: GetCompanyResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
    GetCompanies(getCompanies: GetCompanies, callback: (err: any, result: GetCompaniesResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
    GetCompanyStatus(getCompanyStatus: GetCompanyStatus, callback: (err: any, result: GetCompanyStatusResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
    SearchCompany(searchCompany: SearchCompany, callback: (err: any, result: SearchCompanyResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
    GetUpdatedCompanies(getUpdatedCompanies: GetUpdatedCompanies, callback: (err: any, result: GetUpdatedCompaniesResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
    GetCompanyTaxDebt(getCompanyTaxDebt: GetCompanyTaxDebt, callback: (err: any, result: GetCompanyTaxDebtResponse, rawResponse: any, soapHeader: any, rawRequest: any) => void): void;
}
