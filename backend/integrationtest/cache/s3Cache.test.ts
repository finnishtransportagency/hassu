/* tslint:disable:only-arrow-functions no-unused-expression */
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { S3Cache } from "../../src/cache/s3Cache";

import { expect } from "chai";

describe("S3Cache", () => {
  after(() => {
    sinon.restore();
  });

  it("should use cache successfully", async function () {
    const s3Cache = new S3Cache();
    // Unique key for the test data
    const key = "foo" + new Date().toISOString() + ".json";

    async function doTestGet(ttlMillis: number) {
      let triggered = false;
      let populated = false;
      const data = await s3Cache.get(
        key,
        ttlMillis,
        async () => {
          triggered = true;
        },
        async () => {
          populated = true;
          // On real AWS environment the lambda will populate the data to S3
          const populatedData = { foo: "bar" };
          await s3Cache.put(key, populatedData);
          return populatedData;
        }
      );
      return { triggered, populated, data };
    }

    // First populate empty cache
    expect(await doTestGet(1000)).to.eql({
      populated: true,
      triggered: false,
      data: {
        foo: "bar",
      },
    });

    // Expect that the result comes from in-memory cache, so't not populated or expired
    expect(await doTestGet(0)).to.eql({
      populated: false,
      triggered: false,
      data: {
        foo: "bar",
      },
    });
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 1100));

    // Then expect the cache update to be triggered because the data exists and in-memory cache was missed
    expect(await doTestGet(0)).to.eql({
      populated: false,
      triggered: true,
      data: {
        foo: "bar",
      },
    });

    // Finally, test using cached data from S3
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 1001));
    expect(await doTestGet(10000)).to.eql({
      populated: false,
      triggered: false,
      data: {
        foo: "bar",
      },
    });
  });
});
