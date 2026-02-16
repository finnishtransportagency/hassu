// This config file is used in frontend.Dockerfile
// By keeping the existing as is we dont break working things
const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");
const nextTranslate = require("next-translate-plugin");
const { BaseConfig } = require("./common/BaseConfig");
const CopyPlugin = require("copy-webpack-plugin");
const dotenv = require("dotenv");
const fs = require("fs");

// Sovellukselle tuleva liikenne on /frontend prefixin takana pilviympäristöissä
// tulee huomioida redirecteissä
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

function setupLocalDevelopmentMode(config) {
  let envTest = dotenv.parse(fs.readFileSync("./.env.test").toString());
  const { VELHO_AUTH_URL, VELHO_API_URL, VELHO_USERNAME, VELHO_PASSWORD } = envTest;

  process.env.AWS_SDK_LOAD_CONFIG = "true";
  let env = {
    AWS_REGION: "eu-west-1",
    "x-hassudev-uid": process.env.HASSUDEV_UID,
    "x-hassudev-roles": process.env.HASSUDEV_ROLES,
    REACT_APP_API_URL: "http://localhost:3000/graphql",
    APPSYNC_URL: process.env.REACT_APP_API_URL,
    SEARCH_DOMAIN: process.env.SEARCH_DOMAIN,
    NEXT_PUBLIC_VERSION: process.env.VERSION ?? "",
    NEXT_PUBLIC_AJANSIIRTO_SALLITTU: "true",
    NEXT_PUBLIC_FRONTEND_DOMAIN_NAME: process.env.FRONTEND_DOMAIN_NAME,
    NEXT_PUBLIC_KEYCLOAK_DOMAIN: process.env.KEYCLOAK_DOMAIN,
    NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
    NEXT_PUBLIC_VAYLA_EXTRANET_URL: process.env.NEXT_PUBLIC_VAYLA_EXTRANET_URL ?? envTest.NEXT_PUBLIC_VAYLA_EXTRANET_URL,
    NEXT_PUBLIC_VELHO_BASE_URL: process.env.NEXT_PUBLIC_VELHO_BASE_URL,
    NEXT_PUBLIC_PALAUTE_KYSELY_TIEDOT: process.env.NEXT_PUBLIC_PALAUTE_KYSELY_TIEDOT,
    NEXT_PUBLIC_EVK_ACTIVATION_DATE: process.env.NEXT_PUBLIC_EVK_ACTIVATION_DATE,
    INFRA_ENVIRONMENT: BaseConfig.infraEnvironment,
    NEXT_PUBLIC_ENVIRONMENT: BaseConfig.env,
    ENVIRONMENT: BaseConfig.env,
    TABLE_PROJEKTI: BaseConfig.projektiTableName,
    TABLE_LYHYTOSOITE: BaseConfig.lyhytOsoiteTableName,
    INTERNAL_BUCKET_NAME: BaseConfig.internalBucketName,
    EVENT_SQS_URL: process.env.EVENT_SQS_URL,
    HYVAKSYMISESITYS_SQS_URL: process.env.HYVAKSYMISESITYS_SQS_URL,
    // Tuki asianhallinnan käynnistämiseen testilinkillä [oid].dev.ts kautta. Ei tarvita kun asianhallintaintegraatio on automaattisesti käytössä.
    ASIANHALLINTA_SQS_URL: process.env.ASIANHALLINTA_SQS_URL,
    PUBLIC_BUCKET_NAME: process.env.PUBLIC_BUCKET_NAME,
    YLLAPITO_BUCKET_NAME: process.env.YLLAPITO_BUCKET_NAME,
    VELHO_AUTH_URL,
    VELHO_API_URL,
    VELHO_USERNAME,
    VELHO_PASSWORD,
  };

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
    // env variables starting with NEXT_PUBLIC_ are bundled -> placeholder values at build time
    // actual env variables are provided runtime
    config.redirects = async () => {
      return lyhytOsoiteRedirects;
    };
  }
  return nextTranslate(config);
};
