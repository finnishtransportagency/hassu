/**
 * @jest-environment jsdom
 */

import sinon from "sinon";
import { parameterStore } from "../../util/parameterStore";
import { createAuthorizationHeader, validateCredentials } from "../../util/basicAuthentication";

describe("BasicAuthentication", () => {
  let getParameterStub: sinon.SinonStub;
  beforeAll(() => {
    getParameterStub = sinon.stub(parameterStore, "getParameter");
  });
  afterAll(() => {
    getParameterStub.restore();
  });

  it("Validates credentials successfully", () => {
    getParameterStub.resolves("foo=bar\nabc=123");
    expect(validateCredentials(createAuthorizationHeader("foo", "bar"))).resolves.toBe(true);
    expect(validateCredentials(createAuthorizationHeader("abc", "123"))).resolves.toBe(true);
    expect(validateCredentials(createAuthorizationHeader("a", "b"))).resolves.toBe(false);
  });
});
