/* tslint:disable:no-console */
// @ts-ignore
import fs from "fs";

export function readVariables(stackName: string) {
  try {
    const outputObject = JSON.parse(
      fs.readFileSync(__dirname + "/../../../.cdk-" + stackName + "-outputs.json").toString("UTF-8")
    );
    return outputObject[Object.keys(outputObject).filter((value) => value.includes(stackName))[0]];
  } catch (e) {
    // Ignore, because for example frontend stack depends on the database stack and it fails on compile already when deploying the database stack!
    return {};
  }
}
