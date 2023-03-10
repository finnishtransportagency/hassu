import { describe } from "mocha";
import { CFResponse } from "./cfUtil";
import * as sinon from "sinon";

const handler = require("../../../deployment/lib/lambda/frontendRequest").handler;

const { expect } = require("chai");
const authorizedFakeHeader = "Basic " + Buffer.from("${BASIC_USERNAME}:${BASIC_PASSWORD}").toString("base64");

async function runTest(uri: string, authenticated: boolean, expectedStatus: number | undefined, expectedLocation?: string) {
  return new Promise((resolve, reject) => {
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
        try {
          const testData = "(uri:" + uri + ", " + (authenticated ? "authenticated" : "unauthenticated") + ")";
          expect(response.status).to.eq(expectedStatus, "testData:" + testData + " response:" + JSON.stringify(response));
          if (expectedLocation !== undefined) {
            expect(response.headers["location"]?.[0].value).to.eq(
              expectedLocation,
              "expected redirect location to be " + expectedLocation + " testData:" + testData
            );
          }
          resolve(undefined);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

describe("frontendRequest lambda@edge", () => {
  let originalEnv: string | undefined;

  before(() => {
    originalEnv = process.env.ENVIRONMENT;
  });

  afterEach(() => {
    process.env.ENVIRONMENT = originalEnv;
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  it("should return correct response for different paths", async () => {
    process.env.ENVIRONMENT = "prod"; // etusivu vain tuotannnossa
    await runTest("/", false, 302, "/etusivu/index.html");
    await runTest("/something", false, 401);
    await runTest("/yllapito/kirjaudu", false, 401);

    // Basic auth kunnossa
    await runTest("/something", true, undefined);
    await runTest("/yllapito/kirjaudu", true, undefined);

    // Etusivu on auki kaikille
    await runTest("/etusivu", false, undefined);
    await runTest("/etusivu/index.html", false, undefined);

    process.env.ENVIRONMENT = "dev"; // etusivu vain tuotannnossa
    await runTest("/", false, 401);
  });
});
