import * as sinon from "sinon";
import { replaceFieldsByName } from "../../integrationtest/api/testFixtureRecorder";

const { expect } = require("chai");

export function awsMockResolves<T>(stub: sinon.SinonStub, returnValue?: T): void {
  stub.returns({
    promise() {
      return returnValue;
    },
  });
}

export function expectAwsCalls(stub: sinon.SinonStub, ...cleanupFieldNames: string[]): void {
  const calls = stub.getCalls();
  if (calls.length == 0) {
    return;
  }
  const args = calls
    .map((call) => {
      const { Body: _Body, ...rest } = call.args[0];
      if (cleanupFieldNames) {
        replaceFieldsByName(rest, "***unittest***", ...cleanupFieldNames);
      }
      return rest;
    })
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  expect({ stub: stub.toString(), args: args.length == 1 ? args[0] : args }).toMatchSnapshot();
}
