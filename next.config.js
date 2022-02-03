// noinspection JSUnusedGlobalSymbols,JSValidateTypes

const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");
const nextTranslate = require("next-translate");
const { BaseConfig } = require("./common/BaseConfig");

function setupLocalDevelopmentMode(config, env) {
  config.publicRuntimeConfig = { apiImpl: "developerApi" };
  process.env.AWS_SDK_LOAD_CONFIG = "true";
  const AWS = require("aws-sdk");

  const credentials = AWS.config.credentials;
  if (credentials) {
    env.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
    env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
    env.AWS_SESSION_TOKEN = credentials.sessionToken;
  }
  env["x-hassudev-uid"] = process.env.HASSUDEV_UID;
  env["x-hassudev-roles"] = process.env.HASSUDEV_ROLES;

  env.REACT_APP_API_URL = process.env.REACT_APP_API_URL;

  config = {
    ...config,
    env,
    async rewrites() {
      return [
        {
          source: "/yllapito/tiedostot/:path*",
          destination: "https://" + process.env.FRONTEND_DOMAIN_NAME + "/yllapito/tiedostot/:path*",
        },
      ];
    },
  };
  return config;
}

module.exports = (phase) => {
  let env = {
    NEXT_PUBLIC_VAYLA_EXTRANET_URL: process.env.NEXT_PUBLIC_VAYLA_EXTRANET_URL,
    NEXT_PUBLIC_VELHO_BASE_URL: process.env.NEXT_PUBLIC_VELHO_BASE_URL,
    INFRA_ENVIRONMENT: BaseConfig.infraEnvironment,
  };
  /**
   * @type {import('next').NextConfig}
   */
  let config = {
    reactStrictMode: true,
    // trailingSlash: true,
  };
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    config = setupLocalDevelopmentMode(config, env);
  } else {
    try {
      const fs = require("fs");
      let buffer = fs.readFileSync(__dirname + "/.version");
      if (buffer) {
        env.VERSION = buffer.toString("UTF-8");
      }
    } catch (e) {
      // Ignore
    }
    env.REACT_APP_API_KEY= process.env.REACT_APP_API_KEY;
    env.REACT_APP_API_URL = "https://" + process.env.FRONTEND_DOMAIN_NAME + "/graphql";

    config.publicRuntimeConfig = { apiImpl: "permanentApi" };
    config.env = env;
  }
  return nextTranslate(config);
};
