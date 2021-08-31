// Read environment values from .cdk-outputs.json and put them into .env.local file
// @ts-ignore
import * as outputs from "../../.cdk-frontend-outputs.json";
import * as fs from "fs";

// @ts-ignore
const outputObject = outputs.default;
const variables = outputObject[Object.keys(outputObject).filter((value) => value.includes("frontend"))[0]];

const properties = `REACT_APP_API_URL=https://${variables.CloudfrontDomainName}/graphql
REACT_APP_API_KEY=${variables.AppSyncAPIKey}
`;

fs.writeFileSync(__dirname + "/../../.env.local", properties);
