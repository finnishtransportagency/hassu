const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");
const nextTranslate = require("next-translate-plugin");
const { BaseConfig } = require("./common/BaseConfig");
const CopyPlugin = require("copy-webpack-plugin");

// Middleware poistaa /frontend prefixin ennen kuin redirectit ajetaa
const lyhytOsoiteRedirects = [
  {
    source: `${BaseConfig.frontendPrefix}/s/:path*`,
    destination: "/api/s/:path*",
    permanent: true,
    basePath: false,
    locale: BaseConfig.frontendPrefix ? undefined : false,
  },
  {
    source: `${BaseConfig.frontendPrefix}/fi/s/:path*`,
    destination: "/api/s/:path*",
    permanent: true,
    basePath: false,
    locale: BaseConfig.frontendPrefix ? undefined : false,
  },
  {
    source: `${BaseConfig.frontendPrefix}/sv/s/:path*`,
    destination: "/api/sv/s/:path*",
    permanent: true,
    basePath: false,
    locale: BaseConfig.frontendPrefix ? undefined : false,
  },
  {
    source: `${BaseConfig.frontendPrefix}/sv/keycloak/:path*`,
    destination: "/keycloak/:path*",
    permanent: true,
    locale: BaseConfig.frontendPrefix ? undefined : false,
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

    // .dev.ts, .dev.tsx", .dev.js, and .dev.jsx are always bundled but 404 is shown in prod
    pageExtensions: ["ts", "tsx", "js", "jsx"].map((ext) => [`dev.${ext}`, ext]).flat(),
    output: "standalone",
  };
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    config = setupLocalDevelopmentMode(config);
  } else {
    // actual env variables are provided runtime
    config.redirects = async () => {
      return lyhytOsoiteRedirects;
    };
  }
  return nextTranslate(config);
};
