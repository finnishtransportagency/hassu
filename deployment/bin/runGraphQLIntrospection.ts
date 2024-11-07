#!/usr/bin/env node
/* tslint:disable:no-console */
import fs from "fs";
import { Config } from "../lib/config";
import { sendSignedRequest } from "../../backend/src/aws/awsRequest";
import { HttpRequest } from "@smithy/protocol-http";

process.env.AWS_SDK_LOAD_CONFIG = "true";
type Type = {
  __typename: "__Type";
  name: string;
  possibleTypes?: Type[];
};
type Schema = {
  __typename: "__Schema";
  types: Type[];
};

if (Config.isDeveloperEnvironment()) {
  const urlObject = new URL(process.env.REACT_APP_API_URL || "");

  sendSignedRequest(
    new HttpRequest({
      body: JSON.stringify({
        operationName: null,
        variables: {},
        query: `{
        __schema {
          types {
            kind
            name
            possibleTypes {
              name
              __typename
            }
            __typename
          }
          __typename
        }
      }`,
      }),
      headers: {
        "Content-Type": "application/json",
        host: urlObject.host,
      },
      hostname: urlObject.hostname,
      method: "POST",
      path: "/graphql",
    }),
    "appsync"
  )
    .then(({ body }) => {
      const value: Schema = (body as { data: { __schema: Schema } }).data.__schema;
      const typeComparatorFn = (a: Type, b: Type) => a.name.localeCompare(b.name);
      value.types = value.types.sort(typeComparatorFn);
      value.types.map((type) => {
        if (type.possibleTypes) {
          type.possibleTypes = type.possibleTypes.sort(typeComparatorFn);
        }
      });
      fs.writeFileSync("src/services/api/fragmentTypes.json", JSON.stringify({ __schema: value }, null, 2) + "\n");
    })
    .catch((reason: any) => console.log(reason));
}
