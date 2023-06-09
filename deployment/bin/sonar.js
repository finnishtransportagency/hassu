#!/usr/bin/env node

let projectKey;
let env = process.env.ENVIRONMENT;
if (env === "dev") {
  projectKey = "Hassu-main";
} else if (env === "feature") {
  projectKey = "Hassu-feature";
} else if (["test", "training", "prod"].indexOf(env) >= 0) {
  return;
} else {
  projectKey = "Hassu-" + env;
}

const scanner = require("sonarqube-scanner");
const latestVersion = process.env.LATEST_VERSION;
console.log("latestVersion: " + latestVersion);
scanner(
  {
    options: {
      "sonar.host.url": process.env.SONARQUBE_HOST_URL,
      "sonar.token": process.env.SONARQUBE_ACCESS_TOKEN,
      "sonar.projectKey": projectKey,
      "sonar.projectVersion": latestVersion,
    },
  },
  () => process.exit()
);
