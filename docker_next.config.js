// This config file is used in frontend.Dockerfile
// By keeping the existing as is we dont break working things
const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");
const nextTranslate = require("next-translate-plugin");
const { BaseConfig } = require("./common/BaseConfig");
const CopyPlugin = require("copy-webpack-plugin");

const lyhytOsoiteRedirects = [
  {
    source: "/s/:path*",
    destination: "/api/s/:path*",
    permanent: true,
    basePath: false,
    locale: false,
  },
  {
    source: "/fi/s/:path*",
    destination: "/api/s/:path*",
    permanent: true,
    basePath: false,
    locale: false,
  },
  {
    source: "/sv/s/:path*",
    destination: "/api/sv/s/:path*",
    permanent: true,
    basePath: false,
    locale: false,
  },
  {
    source: "/sv/keycloak/:path*",
    destination: "/keycloak/:path*",
    permanent: true,
    locale: false,
  },
];

const urlRewrites = [
  {
    source: `${BaseConfig.frontendPrefix}/:path*`,
    destination: "/:path*",
  },
];

function setupLocalDevelopmentMode(config, env) {
  process.env.AWS_SDK_LOAD_CONFIG = "true";
  env.AWS_REGION = "eu-west-1";
  env["x-hassudev-uid"] = process.env.HASSUDEV_UID;
  env["x-hassudev-roles"] = process.env.HASSUDEV_ROLES;

  env.REACT_APP_API_URL = "http://localhost:3000/graphql";
  env.APPSYNC_URL = process.env.REACT_APP_API_URL;
  env.SEARCH_DOMAIN = process.env.SEARCH_DOMAIN;
  env.NEXT_PUBLIC_VERSION = process.env.VERSION;
  env.NEXT_PUBLIC_AJANSIIRTO_SALLITTU = "true";
  env.NEXT_PUBLIC_FRONTEND_DOMAIN_NAME = process.env.FRONTEND_DOMAIN_NAME;
  env.NEXT_PUBLIC_KEYCLOAK_DOMAIN = process.env.KEYCLOAK_DOMAIN;
  env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;

  /**
   * @type {import("next").NextConfig}
   */
  config = {
    ...config,
    env,
    async rewrites() {
      return [
        ...urlRewrites,
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
        {
          source: "/hassu/:path*",
          destination: "https://" + process.env.FRONTEND_DOMAIN_NAME + "/hassu/:path*",
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
        ...lyhytOsoiteRedirects,
      ];
    },
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
      // Important: return the modified config
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: "backend/developer/playground.html",
              to: config.output.path + "/../static/graphql-playground/index.html",
            },
          ],
        })
      );
      return config;
    },
  };
  return config;
}

module.exports = (phase) => {
  /**
   * @type {import("next").NextConfig}
   */
  let config = {
    reactStrictMode: true,
    // trailingSlash: true,

    // .dev.ts, .dev.tsx", .dev.js, and .dev.jsx are only available in non-prod environments
    pageExtensions: ["ts", "tsx", "js", "jsx"]
      .map((extension) => {
        const isDevServer = BaseConfig.env !== "prod";
        const prodExtension = `(?<!dev\.)${extension}`;
        const devExtension = `dev\.${extension}`;
        return isDevServer ? [devExtension, extension] : prodExtension;
      })
      .flat(),
    output: "standalone",
  };
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    config = setupLocalDevelopmentMode(config, env);
  } else {
    // env variables starting with NEXT_PUBLIC_ are bundled -> placeholder values at build time
    // actual env variables are provided runtime
    config.redirects = async () => {
      return lyhytOsoiteRedirects;
    };
    config.rewrites = async () => {
      return urlRewrites;
    };
  }
  return nextTranslate(config);
};
