import log from "loglevel";

const config = {
  projektiTableName: process.env.TABLE_PROJEKTI,
  cognitoURL: process.env.COGNITO_URL,
  velhoAuthURL: process.env.VELHO_AUTH_URL,
  velhoApiURL: process.env.VELHO_API_URL,
  velhoUsername: process.env.VELHO_USERNAME,
  velhoPassword: process.env.VELHO_PASSWORD,

  personSearchApiURL: process.env.PERSON_SEARCH_API_URL,
  personSearchUsername: process.env.PERSON_SEARCH_API_USERNAME,
  personSearchPassword: process.env.PERSON_SEARCH_API_PASSWORD,
  personSearchAccountTypes: process.env.PERSON_SEARCH_API_ACCOUNT_TYPES?.split(","),

  searchDomain: process.env.SEARCH_DOMAIN,

  env: process.env.ENVIRONMENT,
};

const logLevel = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";
log.setLevel(logLevel as any);

export { config };
