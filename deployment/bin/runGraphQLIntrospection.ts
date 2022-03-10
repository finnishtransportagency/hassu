#!/usr/bin/env node
/* tslint:disable:no-console */
import fs from "fs";
import { api } from "../../src/services/api/developerApi";
import { OperationType } from "../../common/abstractApi";
import { Config } from "../lib/config";

process.env.AWS_SDK_LOAD_CONFIG = "true";
type Type = {
  __typename: "__Type";
  name: string;
};
type Schema = {
  __typename: "__Schema";
  types: Type[];
};

if (Config.isDeveloperEnvironment()) {
  api
    .callAPI({
      name: "__schema" as any,
      graphql: `
      {
        __schema {
          types {
            kind
            name
            possibleTypes {
              name
            }
          }
        }
      }
`,
      operationType: OperationType.Query,
    })
    .then((value: Schema) => {
      value.types = value.types.sort((a, b) => a.name.localeCompare(b.name));
      fs.writeFileSync("src/services/api/fragmentTypes.json", JSON.stringify({ __schema: value }, null, 2) + "\n");
    })
    .catch((reason: any) => console.log(reason));
}
