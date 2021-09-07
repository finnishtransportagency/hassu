// Read environment values from .cdk-outputs.json and put them into .env.local file
// @ts-ignore
import * as frontendOutputs from "../../.cdk-frontend-outputs.json";
// @ts-ignore
import * as backendOutputs from "../../.cdk-backend-outputs.json";
import * as fs from "fs";

function findVariables(outputs: any, stackName: string) {
  const frontendOutputObject = outputs.default;
  return frontendOutputObject[Object.keys(frontendOutputObject).filter((value) => value.includes(stackName))[0]];
}

const frontEndvariables = findVariables(frontendOutputs, "frontend");
const backEndvariables = findVariables(backendOutputs, "backend");

const properties = `REACT_APP_API_URL=https://${frontEndvariables.CloudfrontDomainName}/graphql
REACT_APP_API_KEY=${backEndvariables.AppSyncAPIKey}
`;

fs.writeFileSync(__dirname + "/../../.env.local", properties);
