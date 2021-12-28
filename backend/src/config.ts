import log from "loglevel";
import * as AWSXRay from "aws-xray-sdk";

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(name + "-ympäristömuuttujaa ei ole asetettu");
  }
  return value;
}

const config = {
  projektiTableName: process.env.TABLE_PROJEKTI || "",
  cognitoURL: getEnv("COGNITO_URL"),
  velhoAuthURL: getEnv("VELHO_AUTH_URL"),
  velhoApiURL: getEnv("VELHO_API_URL"),
  velhoUsername: getEnv("VELHO_USERNAME"),
  velhoPassword: getEnv("VELHO_PASSWORD"),

  personSearchApiURL: getEnv("PERSON_SEARCH_API_URL"),
  personSearchUsername: getEnv("PERSON_SEARCH_API_USERNAME"),
  personSearchPassword: getEnv("PERSON_SEARCH_API_PASSWORD"),
  personSearchAccountTypes: getEnv("PERSON_SEARCH_API_ACCOUNT_TYPES").split(","),
  personSearchUpdaterLambdaArn: process.env.PERSON_SEARCH_UPDATER_LAMBDA_ARN || "",

  searchDomain: getEnv("SEARCH_DOMAIN"),

  env: getEnv("ENVIRONMENT"),

  frontendDomainName: getEnv("FRONTEND_DOMAIN_NAME"),

  frontendPrivateKey: getEnv("FRONTEND_PRIVATEKEY"),

  uploadBucketName: getEnv("UPLOAD_BUCKET_NAME"),
  yllapitoBucketName: getEnv("YLLAPITO_BUCKET_NAME"),
  internalBucketName: getEnv("INTERNAL_BUCKET_NAME"),
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
