// Contains code generated or recommended by Amazon Q
import { describe, it, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import * as sinon from "sinon";
import { migrateTable, sendWithRetry } from "../../../deployment/bin/db-migration-tool/migrateTable";
import { SchemaMetaTable } from "../../../deployment/bin/db-migration-tool/SchemaMetaTable";
import * as ddbModule from "../../../deployment/bin/db-migration-tool/ddb";
import {
  TableConfig,
  MigrateAllTablesOptions,
  DryRunMigrateAllTablesOptions,
  PagedMigrationRunPlan,
  PagedMigrationRunPlanResponse,
} from "../../../deployment/bin/db-migration-tool/types";

// TODO: Skipped until mockClient isolation issue with projektiDatabase.test.ts is resolved
describe.skip("sendWithRetry", () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it("should succeed on first attempt", async () => {
    const fn = sinon.stub().resolves("ok");
    const result = await sendWithRetry(fn);
    expect(result).to.equal("ok");
    expect(fn.callCount).to.equal(1);
  });

  it("should retry on ThrottlingException and succeed", async () => {
    const throttle = new Error("Rate exceeded");
    throttle.name = "ThrottlingException";
    const fn = sinon.stub();
    fn.onFirstCall().rejects(throttle);
    fn.onSecondCall().resolves("ok");

    const promise = sendWithRetry(fn);
    await clock.tickAsync(10_000);
    const result = await promise;

    expect(result).to.equal("ok");
    expect(fn.callCount).to.equal(2);
  });

  it("should throw immediately on non-throttling errors", async () => {
    const err = new Error("AccessDenied");
    err.name = "AccessDeniedException";
    const fn = sinon.stub().rejects(err);

    try {
      await sendWithRetry(fn);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).to.equal(err);
    }
    expect(fn.callCount).to.equal(1);
  });

  it("should give up after MAX_RETRIES throttling errors", async () => {
    const throttle = new Error("Rate exceeded");
    throttle.name = "ThrottlingException";
    const fn = sinon.stub().rejects(throttle);

    const promise = sendWithRetry(fn).catch((e: Error) => e);
    await clock.tickAsync(1_000_000);
    const result = await promise;

    expect(result).to.equal(throttle);
    // MAX_RETRIES = 8, so 9 total attempts (0..8)
    expect(fn.callCount).to.equal(9);
  });
});

// TODO: Skipped until mockClient isolation issue with projektiDatabase.test.ts is resolved
describe.skip("migrateTable", () => {
  let acquireLockStub: sinon.SinonStub;
  let releaseLockStub: sinon.SinonStub;
  let getVersionStub: sinon.SinonStub;
  let setVersionStub: sinon.SinonStub;
  let ddbSendStub: sinon.SinonStub;

  const environment = "test";

  beforeEach(() => {
    acquireLockStub = sinon.stub(SchemaMetaTable.prototype, "acquireTableLock").resolves();
    releaseLockStub = sinon.stub(SchemaMetaTable.prototype, "releaseTableLock").resolves();
    getVersionStub = sinon.stub(SchemaMetaTable.prototype, "getSchemaVersion");
    setVersionStub = sinon.stub(SchemaMetaTable.prototype, "setSchemaVersion").resolves();
    ddbSendStub = sinon.stub(ddbModule.ddb, "send").resolves({});
  });

  afterEach(() => {
    sinon.restore();
  });

  function makeOptions(overrides?: Partial<MigrateAllTablesOptions>): MigrateAllTablesOptions {
    return { environment, ...overrides };
  }

  function makeDryRunOptions(overrides?: Partial<DryRunMigrateAllTablesOptions>): DryRunMigrateAllTablesOptions {
    return { environment, dryRun: true, forcedTableVersions: undefined, ...overrides };
  }

  function makePlan(response: PagedMigrationRunPlanResponse): PagedMigrationRunPlan {
    return sinon.stub().resolves(response);
  }

  it("should skip migrations when current version is already up to date", async () => {
    getVersionStub.resolves(5);
    const plan = sinon.stub();

    const cfg: TableConfig = {
      name: "TestTable",
      migrations: [{ versionId: 3, plan }, { versionId: 5, plan }],
    };

    await migrateTable(cfg, makeOptions());

    expect(plan.callCount).to.equal(0);
    expect(setVersionStub.callCount).to.equal(0);
  });

  it("should run pending migrations in order", async () => {
    getVersionStub.resolves(1);

    const plan2 = makePlan({ updateInput: [{ TableName: "T", Key: { id: "a" }, UpdateExpression: "SET x = :v" }], lastEvaluatedKey: undefined });
    const plan3 = makePlan({ updateInput: [{ TableName: "T", Key: { id: "b" }, UpdateExpression: "SET x = :v" }], lastEvaluatedKey: undefined });

    const cfg: TableConfig = {
      name: "TestTable",
      migrations: [
        { versionId: 2, plan: plan2 },
        { versionId: 3, plan: plan3 },
      ],
    };

    await migrateTable(cfg, makeOptions());

    expect((plan2 as sinon.SinonStub).calledBefore(plan3 as sinon.SinonStub)).to.be.true;
    expect(setVersionStub.firstCall.args).to.deep.equal(["TestTable", 2]);
    expect(setVersionStub.secondCall.args).to.deep.equal(["TestTable", 3]);
  });

  it("should handle pagination across multiple pages", async () => {
    getVersionStub.resolves(0);

    const plan: PagedMigrationRunPlan = sinon.stub()
      .onFirstCall().resolves({
        updateInput: [{ TableName: "T", Key: { id: "1" }, UpdateExpression: "SET x = :v" }],
        lastEvaluatedKey: { id: "1" },
      })
      .onSecondCall().resolves({
        updateInput: [{ TableName: "T", Key: { id: "2" }, UpdateExpression: "SET x = :v" }],
        lastEvaluatedKey: undefined,
      });

    const cfg: TableConfig = { name: "TestTable", migrations: [{ versionId: 1, plan }] };

    await migrateTable(cfg, makeOptions());

    expect((plan as sinon.SinonStub).callCount).to.equal(2);
    expect((plan as sinon.SinonStub).secondCall.args[0].startKey).to.deep.equal({ id: "1" });
    // 2 updates = 2 ddb.send calls
    expect(ddbSendStub.callCount).to.equal(2);
  });

  it("should continue to next page when a page has 0 writes", async () => {
    getVersionStub.resolves(0);

    const plan: PagedMigrationRunPlan = sinon.stub()
      .onFirstCall().resolves({
        updateInput: [],
        lastEvaluatedKey: { id: "cursor" },
      })
      .onSecondCall().resolves({
        updateInput: [{ TableName: "T", Key: { id: "1" }, UpdateExpression: "SET x = :v" }],
        lastEvaluatedKey: undefined,
      });

    const cfg: TableConfig = { name: "TestTable", migrations: [{ versionId: 1, plan }] };

    await migrateTable(cfg, makeOptions());

    expect((plan as sinon.SinonStub).callCount).to.equal(2);
    expect(ddbSendStub.callCount).to.equal(1);
  });

  it("should send both UpdateCommand and PutCommand items", async () => {
    getVersionStub.resolves(0);

    const plan = makePlan({
      updateInput: [{ TableName: "T", Key: { id: "u1" }, UpdateExpression: "SET x = :v" }],
      putInput: [{ TableName: "T", Item: { id: "p1", data: "new" } }],
      lastEvaluatedKey: undefined,
    });

    const cfg: TableConfig = { name: "TestTable", migrations: [{ versionId: 1, plan }] };

    await migrateTable(cfg, makeOptions());

    // 1 update + 1 put
    expect(ddbSendStub.callCount).to.equal(2);
  });

  it("should not write anything in dry run mode", async () => {
    const plan = makePlan({
      updateInput: [{ TableName: "T", Key: { id: "1" }, UpdateExpression: "SET x = :v" }],
      lastEvaluatedKey: undefined,
    });

    const cfg: TableConfig = { name: "TestTable", migrations: [{ versionId: 1, plan }] };

    await migrateTable(cfg, makeDryRunOptions({ forcedTableVersions: { TestTable: 0 } }));

    expect(ddbSendStub.callCount).to.equal(0);
    expect(acquireLockStub.callCount).to.equal(0);
    expect(releaseLockStub.callCount).to.equal(0);
    expect(setVersionStub.callCount).to.equal(0);
    // Plan should still be called to show what would happen
    expect((plan as sinon.SinonStub).callCount).to.equal(1);
  });

  it("should use forcedTableVersions in dry run instead of reading from DB", async () => {
    const plan = makePlan({ lastEvaluatedKey: undefined });

    const cfg: TableConfig = {
      name: "TestTable",
      migrations: [{ versionId: 2, plan }, { versionId: 3, plan }],
    };

    await migrateTable(cfg, makeDryRunOptions({ forcedTableVersions: { TestTable: 2 } }));

    // Version forced to 2, so only migration v3 should run
    expect((plan as sinon.SinonStub).callCount).to.equal(1);
    expect(getVersionStub.callCount).to.equal(0);
  });

  it("should acquire and release lock in real run", async () => {
    getVersionStub.resolves(99);
    const cfg: TableConfig = { name: "TestTable", migrations: [] };

    await migrateTable(cfg, makeOptions());

    expect(acquireLockStub.calledOnceWith("TestTable")).to.be.true;
    expect(releaseLockStub.calledOnceWith("TestTable")).to.be.true;
  });

  it("should release lock even when migration fails", async () => {
    getVersionStub.resolves(0);
    const failingPlan: PagedMigrationRunPlan = sinon.stub().rejects(new Error("migration boom"));

    const cfg: TableConfig = { name: "TestTable", migrations: [{ versionId: 1, plan: failingPlan }] };

    try {
      await migrateTable(cfg, makeOptions());
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as Error;
      expect(err.message).to.equal("migration boom");
    }

    expect(releaseLockStub.calledOnceWith("TestTable")).to.be.true;
  });
});
