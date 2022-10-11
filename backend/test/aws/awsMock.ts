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
  calls.map((call) => {
    const { Body: _Body, ...rest } = call.args[0];
    if (cleanupFieldNames) {
      replaceFieldsByName(rest, "***unittest***", ...cleanupFieldNames);
    }
    expect({ stub: stub.toString(), args: { ...rest } }).toMatchSnapshot();
  });
}
