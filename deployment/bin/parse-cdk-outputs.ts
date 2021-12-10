// Read environment values from .cdk-outputs.json and put them into .env.local file
// @ts-ignore
import * as fs from "fs";
import { readVariables } from "../lib/util/cdkoutputs";

const backEndvariables = readVariables("backend");

const properties = `REACT_APP_API_KEY=${backEndvariables.AppSyncAPIKey}
`;

fs.writeFileSync(__dirname + "/../../.env.local", properties);
