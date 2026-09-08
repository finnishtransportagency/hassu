// Contains code generated or recommended by Amazon Q
/**
 * @jest-environment jsdom
 */

import { parameterStore } from "../../util/parameterStore";
import { createAuthorizationHeader, validateCredentials } from "../../util/basicAuthentication";

jest.mock("../../util/parameterStore", () => ({
  parameterStore: { getParameter: jest.fn() },
}));

describe("BasicAuthentication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Validates credentials successfully", () => {
    (parameterStore.getParameter as jest.Mock).mockResolvedValue("foo=bar\nabc=123");
    expect(validateCredentials(createAuthorizationHeader("foo", "bar"))).resolves.toBe(true);
    expect(validateCredentials(createAuthorizationHeader("abc", "123"))).resolves.toBe(true);
    expect(validateCredentials(createAuthorizationHeader("a", "b"))).resolves.toBe(false);
  });
});
