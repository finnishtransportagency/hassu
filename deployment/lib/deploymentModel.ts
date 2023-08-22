export type BackendStackOutputs = {
  AppSyncAPIKey?: string;
  AppSyncAPIURL: string;
  AineistoImportSqsUrl: string;
};

export type AccountStackOutputs = {
  SearchDomainEndpointOutput: string;
  SearchDomainArnOutput: string;
};

export type DatabaseStackOutputs = {
  CloudFrontOriginAccessIdentity: string;
};

export type FrontendStackOutputs = {
  CloudfrontPrivateDNSName: string;
  CloudfrontDistributionId: string;
  FrontendPublicKeyIdOutput: string;
};
