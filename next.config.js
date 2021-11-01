const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");
const AWS = require("aws-sdk");
const fs = require("fs");

function setupLocalDevelopmentMode(config, env) {
  config.publicRuntimeConfig = { apiImpl: "developerApi" };
  process.env.AWS_SDK_LOAD_CONFIG = true;
  const AWS = require("aws-sdk");

  const credentials = AWS.config.credentials;
  if (credentials) {
    env.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
    env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
    env.AWS_SESSION_TOKEN = credentials.sessionToken;
  }
  env["x-hassudev-uid"] = process.env.HASSUDEV_UID;
  env["x-hassudev-roles"] = process.env.HASSUDEV_ROLES;

  let buffer = fs.readFileSync(__dirname + "/.cdk-backend-outputs.json");
  if (buffer) {
    let outputs = JSON.parse(buffer.toString("UTF-8"));
    for (key in outputs) {
      if (key.includes("backend")) {
        env.REACT_APP_API_URL = outputs[key].AppSyncAPIURL;
      }
    }
  }

  config = {
    ...config,
    env,
  };
  return config;
}

module.exports = (phase, { defaultConfig }) => {
  let env = {
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
    REACT_APP_API_KEY: process.env.REACT_APP_API_KEY,
  };
  /**
   * @type {import('next').NextConfig}
   */
  let config = {
    reactStrictMode: true,
    trailingSlash: true,
  };
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    config = setupLocalDevelopmentMode(config, env);
    return config;
  } else {
    config.publicRuntimeConfig = { apiImpl: "permanentApi" };
    config.env = env;
    return config;
  }
};
