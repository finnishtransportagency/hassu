import { ScanCommandInput, ScanCommandOutput, UpdateCommand, UpdateCommandInput } from "@aws-sdk/lib-dynamodb";
import { ddb } from "./ddb";
import pLimit from "p-limit";
import { PagedMigrationRunPlanResponse, TableConfig } from "./types";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { SchemaMetaTable } from "./SchemaMetaTable";

yargs(hideBin(process.argv))
  .scriptName("npm run upgradeDatabase")
  .usage("$0 <command> <env>")
  .command(
    "dryRun <env>",
    "Does not write to database, only reads and shows what is about to change",
    (y) =>
      y.positional("env", {
        type: "string",
        describe: "Ympäristön nimi (esim. pekka, dev, staging, prod)",
        demandOption: true,
      }),
    async (argv) => {
      try {
        console.log(`🔄 Starting database migration dry run for env '${argv.env}'`);
        await migrateAllTables(true, argv.env);
        console.log("🎉 Dry run complete");
      } catch (err) {
        console.error("❌ Dry run failed", err);
        process.exit(1);
      }
    }
  )
  .command(
    "run <env>",
    "Writes changes to database",
    (y) =>
      y.positional("env", {
        type: "string",
        describe: "Ympäristön nimi (esim. pekka, dev, staging, prod)",
        demandOption: true,
      }),
    async (argv) => {
      try {
        console.log(`🔄 Starting database migration run for env '${argv.env}'`);
        await migrateAllTables(false, argv.env);
        console.log("🎉 Migration complete");
      } catch (err) {
        console.error("❌ Migration failed", err);
        process.exit(1);
      }
    }
  )
  .demandCommand(1, "You need to specify a command: dryRun or run")
  .help()
  .parse();

const limit = pLimit(10);

async function migrateAllTables(dryRun: boolean, environment: string) {
  const TABLES: TableConfig[] = [
    {
      name: `Projekti-${environment}`,
      migrations: [
        {
          versionId: 1,
          plan: (options) => import("./Projekti/migrate-001").then((m) => m.default(options)),
        },
      ],
    },
    // {
    //   name: `Kiinteistonomistaja-${environment}`,
    //   migrations: [
    //     { versionId: 1, plan: (options) => import("./Kiinteistonomistaja/migrate-001").then(m => m.default(options)) },
    //     { versionId: 2, plan: (options) => import("./Kiinteistonomistaja/migrate-002").then(m => m.default(options)) }
    //   ]
    // }
  ];
  await Promise.all(TABLES.map((table) => migrateTable(table, dryRun, environment)));
}
async function migrateTable(cfg: TableConfig, dryRun: boolean, environment: string): Promise<void> {
  console.log(`🚀 Checking migrations for ${cfg.name}`);
  const schemaMetaTable = new SchemaMetaTable(environment);

  let lockAcquired = false;
  if (!dryRun) {
    lockAcquired = await schemaMetaTable.acquireTableLock(cfg.name);
    if (!lockAcquired) {
      console.log(`⏳ Skipping ${cfg.name}, another migration in progress`);
      return;
    }
    console.log(`🔒 Lock acquired for ${cfg.name}`);
  }

  try {
    let current = await schemaMetaTable.getSchemaVersion(cfg.name);
    console.log(`📌 Current schema version for ${cfg.name}: ${current}`);

    let ranAnyMigration = false;

    for (const m of cfg.migrations) {
      if (m.versionId > current) {
        ranAnyMigration = true;
        console.log(`${dryRun ? "🧪 Would run" : "🔄 Running"} migration ${cfg.name} v${current} → v${m.versionId}`);
        try {
          let startKey: ScanCommandInput["ExclusiveStartKey"] = undefined;
          let updatedItemsTotal = 0;

          do {
            const page: PagedMigrationRunPlanResponse = await m.plan({
              dryRun,
              startKey,
              tableName: cfg.name,
              versionId: m.versionId,
              environment,
            });

            const lastEvaluatedKey: ScanCommandOutput["LastEvaluatedKey"] = page.lastEvaluatedKey;
            const updateInput: UpdateCommandInput[] = page.updateInput;

            if (!updateInput.length) {
              console.log(`   💤 Page had 0 items - no updates needed`);
              startKey = lastEvaluatedKey;
              continue;
            }
            updatedItemsTotal += updateInput.length;

            console.log(
              `   ${dryRun ? "🧪 Would update" : "✏️ Updating"} ${updateInput.length} item(s): ${JSON.stringify(
                updateInput.map((input) => input.Key)
              )}`
            );
            if (!dryRun) {
              await Promise.all(updateInput.map((item) => limit(() => ddb.send(new UpdateCommand(item)))));
            }
            startKey = lastEvaluatedKey;
          } while (startKey);

          current = m.versionId;
          if (!dryRun) {
            await schemaMetaTable.setSchemaVersion(cfg.name, m.versionId);
          }
          if (updatedItemsTotal === 0) {
            console.log(`💤 Migration ${cfg.name} v${m.versionId} had nothing to update`);
          } else {
            console.log(`✅ ${dryRun ? "Dry run" : "Migration"} ${cfg.name} v${m.versionId} processed ${updatedItemsTotal} item(s)`);
          }
        } catch (err) {
          console.error(`❌ ${dryRun ? "Dry run" : "Migration"} ${cfg.name} v${m.versionId} FAILED`, err);
          throw err;
        }
      }
    }

    if (!ranAnyMigration) {
      console.log(`💤 ${cfg.name} is already at latest schema version (${current}) — no migrations needed`);
    } else {
      console.log(`🎯 ${cfg.name} ${dryRun ? "would end" : "now at"} version ${current}`);
    }
  } finally {
    if (!dryRun && lockAcquired) {
      await schemaMetaTable.releaseTableLock(cfg.name);
      console.log(`🔓 Lock released for ${cfg.name}`);
    }
  }
}
