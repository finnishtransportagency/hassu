import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "./ddb";
import { nowWithOffset } from "./nowWithOffset";
import { Config } from "../../lib/config";

type Migration = {
  id: number;
  run: (tableName: string, versionId: number) => Promise<void>;
};

type TableConfig = {
  name: string;
  latest: number;
  migrations: Migration[];
};

const TABLES: TableConfig[] = [
  {
    name: Config.projektiTableName,
    latest: 1,
    migrations: [
      {
        id: 1,
        run: (table, id) => import("./Projekti/migrate-001").then((m) => m.default(table, id)),
      },
    ],
  },
  // {
  //   name: Config.kiinteistonomistajaTableName,
  //   latest: 2,
  //   migrations: [
  //     { id: 1, run: (t) => import("./Kiinteistonomistaja/migrate-001").then(m => m.default(t)) },
  //     { id: 2, run: (t) => import("./Kiinteistonomistaja/migrate-002").then(m => m.default(t)) }
  //   ]
  // }
];

/**
 * ========= SchemaMeta helpers =========
 */
async function getSchemaVersion(tableName: string): Promise<number> {
  const res = await ddb.send(
    new GetCommand({
      TableName: Config.schemaMetaTableName,
      Key: { tableName },
    })
  );
  return res.Item?.currentVersion ?? 1;
}

async function setSchemaVersion(tableName: string, v: number): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: Config.schemaMetaTableName,
      Key: { tableName },
      UpdateExpression: "SET currentVersion = :v REMOVE lockUntil",
      ExpressionAttributeValues: { ":v": v },
    })
  );
}

/**
 * ========= Lock helpers =========
 */
async function acquireSchemaLock(tableName: string, lockSeconds = 600): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const lockExpire = now + lockSeconds;

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: Config.schemaMetaTableName,
        Key: { tableName },
        UpdateExpression: "SET lockUntil = :lock",
        ConditionExpression: "attribute_not_exists(lockUntil) OR lockUntil < :now",
        ExpressionAttributeValues: {
          ":lock": lockExpire,
          ":now": now,
        },
      })
    );
    return true;
  } catch {
    // Lukitus oli voimassa
    return false;
  }
}

async function releaseSchemaLock(tableName: string) {
  await ddb.send(
    new UpdateCommand({
      TableName: Config.schemaMetaTableName,
      Key: { tableName },
      UpdateExpression: "REMOVE lockUntil",
    })
  );
}

/**
 * ========= MigrationRun helpers =========
 */
async function acquireMigrationLease(table: string, version: number): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const leaseUntil = now + 600;

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: Config.migrationRunTableName,
        Key: { migrationId: `${table}-${version}` },
        UpdateExpression: `
        SET status = :running,
            leaseUntil = :lease,
            attempts = if_not_exists(attempts, :zero) + :one
      `,
        ConditionExpression: `
        attribute_not_exists(status)
        OR (status <> :done AND leaseUntil < :now)
      `,
        ExpressionAttributeValues: {
          ":running": "running",
          ":done": "done",
          ":lease": leaseUntil,
          ":now": now,
          ":zero": 0,
          ":one": 1,
        },
      })
    );
    return true;
  } catch {
    return false;
  }
}

async function markMigrationDone(table: string, version: number) {
  await ddb.send(
    new UpdateCommand({
      TableName: Config.migrationRunTableName,
      Key: { migrationId: `${table}-${version}` },
      UpdateExpression: `
      SET status = :done,
          finishedAt = :now
      REMOVE leaseUntil
    `,
      ExpressionAttributeValues: {
        ":done": "done",
        ":now": nowWithOffset(),
      },
    })
  );
}

/**
 * ========= Orchestrator =========
 */
async function migrateTable(cfg: TableConfig): Promise<void> {
  const locked = await acquireSchemaLock(cfg.name);
  if (!locked) {
    console.log(`⏳ Skipping ${cfg.name}, another migration in progress`);
    return;
  }

  try {
    const current = await getSchemaVersion(cfg.name);

    for (const m of cfg.migrations) {
      if (m.id > current) {
        const migrationLocked = await acquireMigrationLease(cfg.name, m.id);
        if (!migrationLocked) {
          console.log(`⏳ Migration ${cfg.name}-${m.id} already executed, skipping`);
          continue;
        }

        console.log(`🔄 Running migration ${cfg.name}-${m.id}`);
        await m.run(cfg.name, m.id);
        await markMigrationDone(cfg.name, m.id);
      }
    }

    await setSchemaVersion(cfg.name, cfg.latest);
    console.log(`✅ ${cfg.name} schema at version ${cfg.latest}`);
  } finally {
    await releaseSchemaLock(cfg.name);
  }
}

/**
 * ========= Entry =========
 */
(async () => {
  try {
    await Promise.all(TABLES.map(migrateTable));
    console.log("🎉 All tables migrated successfully");
  } catch (err) {
    console.error("❌ Migration failed", err);
    process.exit(1);
  }
})();
