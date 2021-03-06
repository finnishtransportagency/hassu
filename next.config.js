// noinspection JSUnusedGlobalSymbols,JSValidateTypes

const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");
const nextTranslate = require("next-translate");
const { BaseConfig } = require("./common/BaseConfig");
const CopyFilePlugin = require("copy-file-plugin");

function setupLocalDevelopmentMode(config, env) {
  process.env.AWS_SDK_LOAD_CONFIG = "true";
  const AWS = require("aws-sdk");

  const credentials = AWS.config.credentials;
  if (credentials) {
    env.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
    env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
    env.AWS_SESSION_TOKEN = credentials.sessionToken;
    env.AWS_REGION = "eu-west-1";
  }
  env["x-hassudev-uid"] = process.env.HASSUDEV_UID;
  env["x-hassudev-roles"] = process.env.HASSUDEV_ROLES;

  env.REACT_APP_API_URL = "http://localhost:3000/graphql";
  env.APPSYNC_URL = process.env.REACT_APP_API_URL;
  env.SEARCH_DOMAIN = process.env.SEARCH_DOMAIN;

  /**
   * @type {import("next").NextConfig}
   */
  config = {
    ...config,
    env,
    async rewrites() {
      return [
        {
          source: "/yllapito/tiedostot/:path*",
          destination: "https://" + process.env.FRONTEND_DOMAIN_NAME + "/yllapito/tiedostot/:path*",
        },
        {
          source: "/tiedostot/:path*",
          destination: "https://" + process.env.FRONTEND_DOMAIN_NAME + "/tiedostot/:path*",
        },
        {
          source: "/graphql",
          destination: "/api/graphql",
        },
        {
          source: "/yllapito/graphql",
          destination: "/api/graphql?yllapito=true",
        },
      ];
    },
    redirects: () => {
      return [
        // Just some dummy url to prevent login page loops on local
        {
          source: "/yllapito/kirjaudu",
          destination: "/fake_login_page",
          permanent: true,
        },
      ];
    },
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
      // Important: return the modified config
      config.plugins.push(
        new CopyFilePlugin([
          {
            // For some reason index.html is not copied without a reference to node_modules. This file is not even copied to the destination...
            from: "node_modules/.bin/npm",
            to: config.output.path + "/static/graphql-playground/",
          },
          {
            from: "backend/developer/playground.html",
            to: config.output.path + "/static/graphql-playground/index.html",
          },
        ])
      );
      return config;
    },
  };
  return config;
}

module.exports = (phase) => {
  let env = {
    NEXT_PUBLIC_VAYLA_EXTRANET_URL: process.env.NEXT_PUBLIC_VAYLA_EXTRANET_URL,
    NEXT_PUBLIC_VELHO_BASE_URL: process.env.NEXT_PUBLIC_VELHO_BASE_URL,
    INFRA_ENVIRONMENT: BaseConfig.infraEnvironment,
    ENVIRONMENT: BaseConfig.env,
  };
  /**
   * @type {import("next").NextConfig}
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
    env.REACT_APP_API_KEY = process.env.REACT_APP_API_KEY;
    env.REACT_APP_API_URL = "https://" + process.env.FRONTEND_DOMAIN_NAME + "/graphql";
    env.SEARCH_DOMAIN = process.env.SEARCH_DOMAIN;

    config.env = env;
  }
  return nextTranslate(config);
};
