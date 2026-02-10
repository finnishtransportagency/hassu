import { DryRunMigrateAllTablesOptions, MigrateAllTablesOptions, TableConfig, TableVersionMap } from "./types";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { migrateTable } from "./migrateTable";
import { DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { ddb } from "./ddb";

yargs(hideBin(process.argv))
  .scriptName("npm run upgrade-database")
  .usage("$0 <command> <env>")
  .command(
    "dry-run <env>",
    "Simulates database migrations without writing any changes",
    (y) =>
      y
        .positional("env", {
          type: "string",
          describe: "Name of the environment (e.g., pekka, dev, staging, prod)",
          demandOption: true,
        })
        .option("schema-version", {
          alias: "v",
          type: "array",
          describe: "Override current schema version per table (Table=Version)",
        }),
    async (argv) => {
      try {
        const options: DryRunMigrateAllTablesOptions = {
          environment: argv.env,
          dryRun: true,
          forcedTableVersions: parseCurrentSchemaVersionArg(argv.schemaVersion),
        };
        console.log(`🔄 Starting database migration dry run with options='${JSON.stringify(options)}'`);
        await migrateAllTables(options);
        console.log("🎉 Dry run complete");
      } catch (err) {
        console.error("❌ Dry run failed", err);
        process.exit(1);
      }
    }
  )
  .command(
    "run <env>",
    "Executes pending database migrations and writes changes",
    (y) =>
      y.positional("env", {
        type: "string",
        describe: "Name of the environment (e.g., dev, staging, prod)",
        demandOption: true,
      }),
    async (argv) => {
      try {
        const options: MigrateAllTablesOptions = {
          environment: argv.env,
        };
        console.log(`🔄 Starting database migration run with options=${JSON.stringify(options)}`);
        await migrateAllTables(options);
        console.log("🎉 Migration complete");
      } catch (err) {
        console.error("❌ Migration failed", err);
        process.exit(1);
      }
    }
  )
  .demandCommand(1, "You need to specify a command: dry-run or run")
  .strict()
  .help()
  .parseAsync()
  .catch((err) => {
    console.error("❌ Unhandled CLI error", err);
    process.exit(1);
  });

async function migrateAllTables(options: MigrateAllTablesOptions | DryRunMigrateAllTablesOptions) {
  const TABLES: TableConfig[] = [
    {
      name: `Projekti-${options.environment}`,
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

  validateMigrationOptions(options, TABLES);
  await assertMigrationPrerequisites(options, TABLES);

  for (const table of TABLES) {
    await migrateTable(table, options);
  }
}

function validateMigrationOptions(
  { forcedTableVersions, dryRun }: MigrateAllTablesOptions | DryRunMigrateAllTablesOptions,
  TABLES: TableConfig[]
): void {
  // Currently this validation only applies to dry runs with --schemaVersion parameters
  // In real runs we always read the actual schema version from the database.
  if (!dryRun || !forcedTableVersions) {
    return;
  }

  const errors: string[] = [];

  for (const table of TABLES) {
    const version = forcedTableVersions[table.name];

    // Ensure every known table has an explicitly provided version.
    // This prevents accidentally assuming version 0 for missing tables.
    if (version === undefined) {
      errors.push(`Missing schema version for table '${table.name}'`);
      continue;
    }

    // Schema versions must be non-negative integers.
    // Reject floats, strings, NaN, and negative values.
    if (!Number.isInteger(version) || version < 0) {
      errors.push(`Invalid schema version for table '${table.name}': ${version}`);
    }
  }

  // Also verify the user did not provide versions for tables
  // that do not exist in this migration configuration.
  // This usually indicates a typo or outdated table name.
  for (const providedTable of Object.keys(forcedTableVersions)) {
    if (!TABLES.some((t) => t.name === providedTable)) {
      errors.push(`Schema version provided for unknown table '${providedTable}'`);
    }
  }

  // If any validation errors were collected, print them all at once
  // and abort the dry run to avoid misleading results.
  if (errors.length > 0) {
    console.error("❌ Invalid dry run schema version configuration:\n");
    errors.forEach((e) => console.error("  - " + e));
    throw new Error("Dry run aborted due to invalid --schemaVersion parameters");
  }
}

function parseCurrentSchemaVersionArg(arg?: (string | number)[]): TableVersionMap | undefined {
  if (!arg) {
    return undefined;
  }

  const result: TableVersionMap = {};

  for (const entry of arg) {
    const entrySplitted = String(entry).split("=");
    const [table, versionStr] = entrySplitted;
    if (entrySplitted.length !== 2 || !table || !versionStr) {
      console.warn(`⚠️ Invalid currentSchemaVersion entry: "${entry}"`);
      continue;
    }

    const version = parseInt(versionStr, 10);
    if (isNaN(version)) {
      console.warn(`⚠️ Invalid version number in entry: "${entry}"`);
      continue;
    }

    result[table] = version;
  }

  return result;
}

async function assertMigrationPrerequisites(
  options: MigrateAllTablesOptions | DryRunMigrateAllTablesOptions,
  tables: TableConfig[]
): Promise<void> {
  const schemaMetaTableName = `SchemaMeta-${options.environment}`;

  console.log("🔍 Verifying DynamoDB access...");

  await assertTableReadable(schemaMetaTableName);

  for (const table of tables) {
    await assertTableReadable(table.name);
  }

  console.log("✅ DynamoDB access verified\n");
}

async function assertTableReadable(tableName: string): Promise<void> {
  try {
    await ddb.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`🔎 Access OK for table ${tableName}`);
  } catch (err) {
    console.error(`❌ Cannot access table ${tableName}`);
    throw err;
  }
}
