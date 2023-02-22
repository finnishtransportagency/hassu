import { describe } from "mocha";
import { CFResponse } from "./cfUtil";

const handler = require("../../../deployment/lib/lambda/frontendRequest").handler;

const { expect } = require("chai");
const authorizedFakeHeader = "Basic " + Buffer.from("${BASIC_USERNAME}:${BASIC_PASSWORD}").toString("base64");

function runTest(uri: string, authenticated: boolean, expectedStatus: number | undefined, expectedLocation?: string) {
  handler(
    {
      Records: [
        {
          cf: {
            request: {
              headers: authenticated
                ? {
                    authorization: [{ value: authorizedFakeHeader }],
                  }
                : {},
              method: "GET",
              uri,
            },
          },
        },
      ],
    },
    null,
    (_request: unknown, response: CFResponse) => {
      const testData = "(uri:" + uri + ", " + (authenticated ? "authenticated" : "unauthenticated") + ")";
      expect(response.status).to.eq(expectedStatus, "testData:" + testData);
      if (expectedLocation !== undefined) {
        expect(response.headers["location"]?.[0].value).to.eq(
          expectedLocation,
          "expected redirect location to be " + expectedLocation + " testData:" + testData
        );
      }
    }
  );
}

describe("frontendRequest lambda@edge", () => {
  let originalEnv: string | undefined;

  before(() => {
    originalEnv = process.env.ENVIRONMENT;
  });

  after(function () {
    process.env.ENVIRONMENT = originalEnv;
  });

  it("should return correct response for different paths", async () => {
    process.env.ENVIRONMENT = "prod"; // etusivu vain tuotannnossa
    runTest("/", false, 302, "/etusivu/index.html");
    runTest("/something", false, 401);
    runTest("/yllapito/kirjaudu", false, 401);

    // Basic auth kunnossa
    runTest("/something", true, undefined);
    runTest("/yllapito/kirjaudu", true, undefined);

    // Etusivu on auki kaikille
    runTest("/etusivu", false, undefined);
    runTest("/etusivu/index.html", false, undefined);

    process.env.ENVIRONMENT = "dev"; // etusivu vain tuotannnossa
    runTest("/", false, 401);
  });
});
