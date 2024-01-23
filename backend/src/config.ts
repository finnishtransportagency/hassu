import { log } from "./logger";
import * as AWSXRay from "aws-xray-sdk-core";

const BaseConfig = require("hassu-common/BaseConfig.js").BaseConfig;

const config = {
  projektiTableName: process.env.TABLE_PROJEKTI,
  lyhytOsoiteTableName: process.env.TABLE_LYHYTOSOITE,
  feedbackTableName: process.env.TABLE_FEEDBACK,
  omistajaTableName: process.env.TABLE_OMISTAJA!,
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
  personSearchUpdaterLambdaArn: process.env.PERSON_SEARCH_UPDATER_LAMBDA_ARN ?? "",

  env: process.env.ENVIRONMENT,

  frontendDomainName: process.env.FRONTEND_DOMAIN_NAME,
  cloudFrontDistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,

  frontendPublicKeyId: process.env.FRONTEND_PUBLIC_KEY_ID,

  uploadBucketName: process.env.UPLOAD_BUCKET_NAME ?? "UPLOAD_BUCKET_NAME puuttuu!",
  yllapitoBucketName: process.env.YLLAPITO_BUCKET_NAME ?? "YLLAPITO_BUCKET_NAME puuttuu!",
  publicBucketName: process.env.PUBLIC_BUCKET_NAME ?? "PUBLIC_BUCKET_NAME puuttuu!",
  internalBucketName: process.env.INTERNAL_BUCKET_NAME ?? "unset",

  emailsOn: process.env.EMAILS_ON,
  emailsTo: process.env.EMAILS_TO,

  ajansiirtoSallittu: process.env.NEXT_PUBLIC_AJANSIIRTO_SALLITTU,
  isProd: (): boolean => process.env.ENVIRONMENT == "prod",
  isPermanentEnvironment: (): boolean => BaseConfig.isPermanentEnvironment(),

  eventSqsUrl: process.env.EVENT_SQS_URL ?? "",
  eventSqsArn: process.env.EVENT_SQS_ARN ?? "",
  schedulerExecutionRoleArn: process.env.SCHEDULER_EXECUTION_ROLE_ARN ?? "",

  pdfGeneratorLambdaArn: process.env.PDF_GENERATOR_LAMBDA_ARN ?? "",
  isInTest: typeof (global as unknown as Record<string, unknown>).it === "function",
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
    // Reduce unnecessary logging in development
    if (BaseConfig.isPermanentEnvironment()) {
      log.info(message, { meta });
    }
  },
  debug: () => {
    // Ignore
  },
});

export { config };
