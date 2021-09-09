// Read environment values from .cdk-outputs.json and put them into .env.local file
// @ts-ignore
// @ts-ignore
import * as backendOutputs from "../../.cdk-backend-outputs.json";
import * as fs from "fs";

function findVariables(outputs: any, stackName: string) {
  const outputObject = outputs.default;
  return outputObject[Object.keys(outputObject).filter((value) => value.includes(stackName))[0]];
}

const backEndvariables = findVariables(backendOutputs, "backend");

const properties = `REACT_APP_API_KEY=${backEndvariables.AppSyncAPIKey}
`;

fs.writeFileSync(__dirname + "/../../.env.local", properties);
