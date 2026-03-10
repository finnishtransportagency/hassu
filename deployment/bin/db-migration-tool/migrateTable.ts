import pLimit from "p-limit";
import { ScanCommandInput, ScanCommandOutput, UpdateCommandInput, UpdateCommand, PutCommandInput, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "./ddb";
import { SchemaMetaTable } from "./SchemaMetaTable";
import { TableConfig, MigrateAllTablesOptions, DryRunMigrateAllTablesOptions, PagedMigrationRunPlanResponse } from "./types";

const limit = pLimit(10);

export async function migrateTable(
  cfg: TableConfig,
  migrateOptions: MigrateAllTablesOptions | DryRunMigrateAllTablesOptions
): Promise<void> {
  const { dryRun, forcedTableVersions } = migrateOptions;

  console.log(`🚀 Checking migrations for ${cfg.name}`);
  const schemaMetaTable = new SchemaMetaTable(migrateOptions.environment);

  if (!dryRun) {
    await schemaMetaTable.acquireTableLock(cfg.name);
  }

  try {
    let current = dryRun && forcedTableVersions ? forcedTableVersions[cfg.name] : await schemaMetaTable.getSchemaVersion(cfg.name);
    console.log(`📌 Current schema version for ${cfg.name}: ${current}`);

    let ranAnyMigration = false;

    for (const m of cfg.migrations) {
      if (m.versionId > current) {
        ranAnyMigration = true;
        console.group();
        console.log(`${dryRun ? "🧪 Would run" : "🔄 Running"} migration ${cfg.name} v${current} → v${m.versionId}`);
        try {
          let startKey: ScanCommandInput["ExclusiveStartKey"] = undefined;
          let updatedItemsTotal = 0;

          do {
            const page: PagedMigrationRunPlanResponse = await m.plan({
              startKey,
              tableName: cfg.name,
              versionId: m.versionId,
              migrateOptions,
            });

            const lastEvaluatedKey: ScanCommandOutput["LastEvaluatedKey"] = page.lastEvaluatedKey;
            const updateInput: UpdateCommandInput[] = page.updateInput ?? [];
            const putInput: PutCommandInput[] = page.putInput ?? [];

            const writesThisPage = updateInput.length + putInput.length;

            if (writesThisPage === 0) {
              console.log(
                `💤 Page returned 0 write operations${
                  lastEvaluatedKey ? `. Continuing to the next page as lastEvaluatedKey=${JSON.stringify(lastEvaluatedKey)}` : ""
                }`
              );
              startKey = lastEvaluatedKey;
              continue;
            }

            updatedItemsTotal += writesThisPage;

            if (updateInput.length) {
              console.log(
                `${dryRun ? "🧪 Would update" : "✏️ Updating"} ${updateInput.length} item(s): ${JSON.stringify(
                  updateInput.map((input) => input.Key)
                )}`
              );
            }

            if (putInput.length) {
              console.log(
                `${dryRun ? "🧪 Would create" : "🆕 Creating"} ${putInput.length} item(s): ${JSON.stringify(
                  putInput.map((input) => {
                    const { pk, sk, id, oid, projektiOid } = input.Item ?? {};
                    return { pk, sk, id, oid, projektiOid };
                  })
                )}`
              );
            }

            if (!dryRun) {
              await Promise.all([
                ...updateInput.map((item) => limit(() => ddb.send(new UpdateCommand(item)))),
                ...putInput.map((item) => limit(() => ddb.send(new PutCommand(item)))),
              ]);
            }

            startKey = lastEvaluatedKey;
          } while (startKey);

          current = m.versionId;
          if (!dryRun) {
            await schemaMetaTable.setSchemaVersion(cfg.name, m.versionId);
          }
          if (updatedItemsTotal === 0) {
            console.log(`💤 Migration ${cfg.name} v${m.versionId} had nothing to write`);
          } else {
            console.log(
              `✅ ${dryRun ? "Dry run" : "Migration"} ${cfg.name} v${m.versionId} processed ${updatedItemsTotal} write operation(s)`
            );
          }
        } catch (err) {
          console.error(`❌ ${dryRun ? "Dry run" : "Migration"} ${cfg.name} v${m.versionId} FAILED`, err);
          throw err;
        }
        console.groupEnd();
      } else {
        console.log(
          `💤 ${dryRun ? "Would skip" : "Skipping"} migration on table ${cfg.name} v${
            m.versionId
          } as current version is already at v${current}`
        );
      }
    }

    if (!ranAnyMigration) {
      console.log(`💤 ${cfg.name} is already at latest schema version (${current}) — no migrations needed`);
    } else {
      console.log(`🎯 ${cfg.name} ${dryRun ? "would end" : "now at"} version ${current}`);
    }
  } finally {
    if (!dryRun) {
      await schemaMetaTable.releaseTableLock(cfg.name);
      console.log(`🔓 Lock released for ${cfg.name}`);
    }
  }
}
