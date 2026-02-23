const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");
const nextTranslate = require("next-translate-plugin");
const { BaseConfig } = require("./common/BaseConfig");
const CopyPlugin = require("copy-webpack-plugin");
const dotenv = require("dotenv");
const fs = require("fs");

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

function setupLocalDevelopmentMode(config, env) {
  /**
   * @type {import("next").NextConfig}
   */
  config = {
    ...config,
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
  };
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    config = setupLocalDevelopmentMode(config);
  } else {
    env.NEXT_PUBLIC_VERSION = process.env.CODEBUILD_SOURCE_VERSION ?? ""; // default version info, overriden in test&prod by semantic version
    try {
      let buffer = fs.readFileSync(__dirname + "/.version");
      if (buffer) {
        env.NEXT_PUBLIC_VERSION = buffer.toString("UTF-8") ?? "";
      }
    } catch (e) {
      // Ignore
    }
    env.NEXT_PUBLIC_REACT_APP_API_KEY = process.env.REACT_APP_API_KEY ?? "";
    env.NEXT_PUBLIC_REACT_APP_API_URL = "https://" + process.env.FRONTEND_API_DOMAIN_NAME + "/graphql";
    env.FRONTEND_DOMAIN_NAME = process.env.FRONTEND_DOMAIN_NAME;
    env.NEXT_PUBLIC_FRONTEND_DOMAIN_NAME = process.env.FRONTEND_DOMAIN_NAME;
    env.SEARCH_DOMAIN = process.env.SEARCH_DOMAIN;

    config.env = env;
    config.redirects = async () => {
      return lyhytOsoiteRedirects;
    };
  }
  return nextTranslate(config);
};
