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
];

function setupLocalDevelopmentMode(config, env) {
  process.env.AWS_SDK_LOAD_CONFIG = "true";
  env.AWS_REGION = "eu-west-1";
  env["x-hassudev-uid"] = process.env.HASSUDEV_UID;
  env["x-hassudev-roles"] = process.env.HASSUDEV_ROLES;

  env.REACT_APP_API_URL = "http://localhost:3000/graphql";
  env.APPSYNC_URL = process.env.REACT_APP_API_URL;
  env.SEARCH_DOMAIN = process.env.SEARCH_DOMAIN;
  env.VERSION = process.env.VERSION;
  env.NEXT_PUBLIC_AJANSIIRTO_SALLITTU = "true";

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
  let env = {
    NEXT_PUBLIC_VAYLA_EXTRANET_URL: process.env.NEXT_PUBLIC_VAYLA_EXTRANET_URL,
    NEXT_PUBLIC_VELHO_BASE_URL: process.env.NEXT_PUBLIC_VELHO_BASE_URL,
    NEXT_PUBLIC_AJANSIIRTO_SALLITTU: process.env.NEXT_PUBLIC_AJANSIIRTO_SALLITTU,
    INFRA_ENVIRONMENT: BaseConfig.infraEnvironment,
    ENVIRONMENT: BaseConfig.env,
    TABLE_PROJEKTI: BaseConfig.projektiTableName,
    TABLE_LYHYTOSOITE: BaseConfig.lyhytOsoiteTableName,
    INTERNAL_BUCKET_NAME: BaseConfig.internalBucketName,
    EVENT_SQS_URL: process.env.EVENT_SQS_URL,
    HYVAKSYMISESITYS_SQS_URL: process.env.HYVAKSYMISESITYS_SQS_URL,
    // Tuki asianhallinnan käynnistämiseen testilinkillä [oid].dev.ts kautta. Ei tarvita kun asianhallintaintegraatio on automaattisesti käytössä.
    ASIANHALLINTA_SQS_URL: process.env.ASIANHALLINTA_SQS_URL,

    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
    KEYCLOAK_DOMAIN: process.env.KEYCLOAK_DOMAIN,
  };

  if (BaseConfig.env !== "prod") {
    let envTest = dotenv.parse(fs.readFileSync("./.env.test").toString());

    const { VELHO_AUTH_URL, VELHO_API_URL, VELHO_USERNAME, VELHO_PASSWORD } = envTest;
    env = {
      ...env,
      VELHO_AUTH_URL,
      VELHO_API_URL,
      VELHO_USERNAME,
      VELHO_PASSWORD,
    };
    if (!env.NEXT_PUBLIC_VAYLA_EXTRANET_URL) {
      env.NEXT_PUBLIC_VAYLA_EXTRANET_URL = envTest.NEXT_PUBLIC_VAYLA_EXTRANET_URL;
    }
    if (!env.NEXT_PUBLIC_AJANSIIRTO_SALLITTU) {
      env.NEXT_PUBLIC_AJANSIIRTO_SALLITTU = envTest.NEXT_PUBLIC_AJANSIIRTO_SALLITTU;
    }

    // Cypress-testeissä eri vaiheiden resetointia varten
    env.PUBLIC_BUCKET_NAME = process.env.PUBLIC_BUCKET_NAME;
    env.YLLAPITO_BUCKET_NAME = process.env.YLLAPITO_BUCKET_NAME;
  }
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
    config = setupLocalDevelopmentMode(config, env);
  } else {
    env.VERSION = process.env.CODEBUILD_SOURCE_VERSION; // default version info, overriden in test&prod by semantic version
    try {
      let buffer = fs.readFileSync(__dirname + "/.version");
      if (buffer) {
        env.VERSION = buffer.toString("UTF-8");
      }
    } catch (e) {
      // Ignore
    }
    env.REACT_APP_API_KEY = process.env.REACT_APP_API_KEY;
    env.REACT_APP_API_URL = "https://" + process.env.FRONTEND_API_DOMAIN_NAME + "/graphql";
    env.FRONTEND_DOMAIN_NAME = process.env.FRONTEND_DOMAIN_NAME;
    env.SEARCH_DOMAIN = process.env.SEARCH_DOMAIN;

    config.env = env;
    config.redirects = async () => {
      return lyhytOsoiteRedirects;
    };
  }
  return nextTranslate(config);
};
