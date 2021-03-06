import { log } from "./logger";
import * as AWSXRay from "aws-xray-sdk-core";

const config = {
  projektiTableName: process.env.TABLE_PROJEKTI,
  projektiArchiveTableName: process.env.TABLE_PROJEKTI_ARCHIVE,
  cognitoURL: process.env.COGNITO_URL,
  velhoAuthURL: process.env.VELHO_AUTH_URL,
  velhoApiURL: process.env.VELHO_API_URL,
  velhoUsername: process.env.VELHO_USERNAME,
  velhoPassword: process.env.VELHO_PASSWORD,

  personSearchApiURL: process.env.PERSON_SEARCH_API_URL,
  personSearchApiURLProd: process.env.PERSON_SEARCH_API_URL_PROD,
  personSearchUsername: process.env.PERSON_SEARCH_API_USERNAME,
  personSearchPassword: process.env.PERSON_SEARCH_API_PASSWORD,
  personSearchUsernameProd: process.env.PERSON_SEARCH_API_USERNAME_PROD,
  personSearchPasswordProd: process.env.PERSON_SEARCH_API_PASSWORD_PROD,
  personSearchAccountTypes: process.env.PERSON_SEARCH_API_ACCOUNT_TYPES?.split(","),
  personSearchUpdaterLambdaArn: process.env.PERSON_SEARCH_UPDATER_LAMBDA_ARN || "",

  env: process.env.ENVIRONMENT,

  frontendDomainName: process.env.FRONTEND_DOMAIN_NAME,
  cloudFrontDistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,

  frontendPrivateKey: process.env.FRONTEND_PRIVATEKEY,
  frontendPublicKeyId: process.env.FRONTEND_PUBLIC_KEY_ID,

  uploadBucketName: process.env.UPLOAD_BUCKET_NAME,
  yllapitoBucketName: process.env.YLLAPITO_BUCKET_NAME,
  publicBucketName: process.env.PUBLIC_BUCKET_NAME,
  internalBucketName: process.env.INTERNAL_BUCKET_NAME || "unset",
  archiveBucketName: process.env.ARCHIVE_BUCKET_NAME,

  smtpKeyId: process.env.SMTP_KEY_ID,
  smtpSecret: process.env.SMTP_SECRET,

  emailsOn: process.env.EMAILS_ON,
  emailsTo: process.env.EMAILS_TO,
  isProd: (): boolean => process.env.ENVIRONMENT == "prod",

  aineistoImportSqsUrl: process.env.AINEISTO_IMPORT_SQS_URL || "",
};

process.env.AWS_XRAY_CONTEXT_MISSING = "LOG_ERROR";
AWSXRay.setContextMissingStrategy("IGNORE_ERROR");

// Create your own logger, or instantiate one using a library.
AWSXRay.setLogger({
  error: (message, meta) => {
    log.error(message, { meta });
  },
  warn: (message, meta) => {
    log.warn(message, { meta });
  },
  info: (message, meta) => {
    // Reduce unnecessary logging in local development
    if (process.env.NODE_ENV !== "development") {
      log.info(message, { meta });
    }
  },
  debug: () => {
    // Ignore
  },
});

export { config };
