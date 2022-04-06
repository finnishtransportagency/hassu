import { describe } from "mocha";

const handler = require("../../../deployment/lib/lambda/tiedostotOriginResponse").handler;

const { expect } = require("chai");

const createEvent = (publicationTimestamp: string | null, expirationTimestamp?: string | null) => {
  const headers = {};
  if (publicationTimestamp) {
    headers["x-amz-meta-publication-timestamp"] = [
      {
        key: "x-amz-meta-publication-timestamp",
        value: publicationTimestamp,
      },
    ];
  }

  if (expirationTimestamp) {
    headers["x-amz-meta-expiration-timestamp"] = [
      {
        key: "x-amz-meta-expiration-timestamp",
        value: expirationTimestamp,
      },
    ];
  }

  return {
    Records: [
      {
        cf: {
          response: {
            headers,
            status: "200",
            statusDescription: "OK",
          },
        },
      },
    ],
  };
};

describe("Tiedostot publication time handler", () => {
  it("should return 404 for unpublished files based on x-amz-meta-publication-timestamp", () => {
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

  it("should return 200 for published files based on x-amz-meta-publication-timestamp", () => {
    handler(createEvent("2022-03-09T08:31:00.000Z"), null, (request, response) => {
      expect(response.status).to.eq("200");
      expect(response.headers).to.eql({});
    });
  });

  it("should return 404 for unpublished files based on x-amz-meta-expiration-timestamp", () => {
    handler(createEvent(null, "2000-03-09T08:31:00.000Z"), null, (request, response) => {
      expect(response.status).to.eq("404");
      expect(response.headers).to.be.undefined;
    });
  });

  it("should return 200 for published files based on x-amz-meta-expiration-timestamp", () => {
    handler(createEvent(null, "2222-03-09T08:31:00.000Z"), null, (request, response) => {
      expect(response.status).to.eq("200");
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

  it("should return 404 for unpublished files based on x-amz-meta-publication-timestamp and x-amz-meta-expiration-timestamp", () => {
    handler(createEvent("2222-03-09T08:31:00.000Z", "2223-03-09T08:31:00.000Z"), null, (request, response) => {
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

  it("should return 200 for published files based on x-amz-meta-publication-timestamp and x-amz-meta-expiration-timestamp", () => {
    handler(createEvent("2022-03-09T08:31:00.000Z", "2222-03-09T08:31:00.000Z"), null, (request, response) => {
      expect(response.status).to.eq("200");
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
});
