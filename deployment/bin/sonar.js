#!/usr/bin/env node

let projectKey;
let version = undefined;
let env = process.env.ENVIRONMENT;
if (env === "dev") {
  projectKey = "Hassu-main";
} else if (env === "feature") {
  projectKey = "Hassu-feature";
  version = process.env.CODEBUILD_BUILD_NUMBER;
} else {
  projectKey = "Hassu-" + env;
}

const scanner = require("sonarqube-scanner");

scanner(
  {
    options: {
      "sonar.host.url": process.env.SONARQUBE_HOST_URL,
      "sonar.login": process.env.SONARQUBE_ACCESS_TOKEN,
      "sonar.projectKey": projectKey,
      "sonar.projectVersion": version,
    },
  },
  () => process.exit()
);
