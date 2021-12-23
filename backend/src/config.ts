import log from "loglevel";
import * as AWSXRay from "aws-xray-sdk";

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

  frontendDomainName: process.env.FRONTEND_DOMAIN_NAME,

  frontendPrivateKey: process.env.FRONTEND_PRIVATEKEY,

  uploadBucketName: process.env.UPLOAD_BUCKET_NAME,
  yllapitoBucketName: process.env.YLLAPITO_BUCKET_NAME,
};

const logLevel = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";
log.setLevel(logLevel as any);

process.env.AWS_XRAY_CONTEXT_MISSING = "LOG_ERROR";
AWSXRay.setContextMissingStrategy("IGNORE_ERROR");

// Create your own logger, or instantiate one using a library.
AWSXRay.setLogger({
  error: (message, meta) => {
    log.error(message, meta);
  },
  warn: (message, meta) => {
    log.warn(message, meta);
  },
  info: (message, meta) => {
    log.info(message, meta);
  },
  debug: (message, meta) => {
    log.debug(message, meta);
  },
});

export { config };
