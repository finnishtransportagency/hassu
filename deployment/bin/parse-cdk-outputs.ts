// Read environment values from .cdk-outputs.json and put them into .env.local file
// @ts-ignore
import * as frontendOutputs from "../../.cdk-frontend-outputs.json";
// @ts-ignore
import * as backendOutputs from "../../.cdk-backend-outputs.json";
import * as fs from "fs";

// @ts-ignore
const frontendOutputObject = frontendOutputs.default;
const frontEndvariables =
  frontendOutputObject[Object.keys(frontendOutputObject).filter((value) => value.includes("frontend"))[0]];
const backendOutputObject = backendOutputs.default;
const backEndvariables =
  frontendOutputObject[Object.keys(backendOutputObject).filter((value) => value.includes("backend"))[0]];

const properties = `REACT_APP_API_URL=https://${frontEndvariables.CloudfrontDomainName}/graphql
REACT_APP_API_KEY=${backEndvariables.AppSyncAPIKey}
`;

fs.writeFileSync(__dirname + "/../../.env.local", properties);
