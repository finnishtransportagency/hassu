import { CompanyQueryServiceEndpoint } from "../ports/CompanyQueryServiceEndpoint";

export interface CompanyQueryService {
    readonly CompanyQueryServiceEndpoint: CompanyQueryServiceEndpoint;
}
