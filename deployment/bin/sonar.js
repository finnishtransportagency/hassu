#!/usr/bin/env node
// Contains code generated or recommended by Amazon Q

let projectKey;
const env = process.env.ENVIRONMENT;
if (env === "dev") {
  projectKey = "Hassu-main";
} else if (env === "feature") {
  projectKey = "Hassu-feature";
} else if (["test", "training", "prod"].indexOf(env) >= 0) {
  process.exit(0);
} else {
  projectKey = "Hassu-" + env;
}

import("sonarqube-scanner").then(({ scan }) => {
  const latestVersion = process.env.LATEST_VERSION;
  console.log("latestVersion: " + latestVersion);
  /*scan({
    "sonar.host.url": process.env.SONARQUBE_HOST_URL,
    "sonar.token": process.env.SONARQUBE_ACCESS_TOKEN,
    "sonar.projectKey": projectKey,
    "sonar.projectVersion": latestVersion,
  })*/
  scan({
    serverUrl: process.env.SONARQUBE_HOST_URL,
    token: process.env.SONARQUBE_ACCESS_TOKEN,
    options: {
      "sonar.projectKey": projectKey,
      "sonar.projectVersion": latestVersion,
    },
  })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
});
