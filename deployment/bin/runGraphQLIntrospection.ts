#!/usr/bin/env node
/* tslint:disable:no-console */
import fs from "fs";
import { api } from "../../src/services/api/developerApi";
import { OperationType } from "../../common/abstractApi";
import { Config } from "../lib/config";

process.env.AWS_SDK_LOAD_CONFIG = "true";

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
      operationType: OperationType.Query
    })
    .then((value: any) => {
      let schema = { __schema: value };
      fs.writeFileSync("src/services/api/fragmentTypes.json", JSON.stringify(schema, null, 2) + "\n");
    })
    .catch((reason: any) => console.log(reason));
}
