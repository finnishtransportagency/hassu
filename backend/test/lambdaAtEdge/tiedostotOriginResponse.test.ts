import { describe } from "mocha";

const handler = require("../../../deployment/lib/lambda/tiedostotOriginResponse").handler;

const { expect } = require("chai");

const createEvent = (timestamp) => ({
  Records: [
    {
      cf: {
        response: {
          headers: {
            "x-amz-meta-publication-timestamp": [
              {
                key: "x-amz-meta-publication-timestamp",
                value: timestamp,
              },
            ],
          },
          status: "200",
          statusDescription: "OK",
        },
      },
    },
  ],
});

describe("Tiedostot publication time handler", () => {
  it("should return 404 for unpublished files", () => {
    handler(createEvent("2222-03-09T08:31:00.000Z"), null, (request, response) => {
      expect(response.status).to.eq("404");
      expect(response.headers).to.eql({
        Expires: [
          {
            key: "Expires",
            value: "Sat, 09 Mar 2222 08:31:00 GMT",
          },
        ],
      });
    });
  });
  it("should return 200 for published files", () => {
    handler(createEvent("2022-03-09T08:31:00.000Z"), null, (request, response) => {
      expect(response.status).to.eq("200");
      expect(response.headers).to.eql({});
    });
  });
});
