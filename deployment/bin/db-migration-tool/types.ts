import { ScanCommandInput, UpdateCommandInput, ScanCommandOutput, PutCommandInput } from "@aws-sdk/lib-dynamodb";

export type TableConfig = {
  name: string;
  migrations: Migration[];
};

export type Migration = {
  versionId: number;
  plan: PagedMigrationRunPlan;
};

export type PagedMigrationRunPlan = (options: PlanOptions) => Promise<PagedMigrationRunPlanResponse>;

export type PlanOptions = {
  tableName: string;
  versionId: number;
  startKey: ScanCommandInput["ExclusiveStartKey"];
  migrateOptions: MigrateAllTablesOptions | DryRunMigrateAllTablesOptions;
};

export type PagedMigrationRunPlanResponse = {
  updateInput?: UpdateCommandInput[];
  putInput?: PutCommandInput[];
  lastEvaluatedKey: ScanCommandOutput["LastEvaluatedKey"];
};

export type MigrateAllTablesOptions = {
  environment: string;
  dryRun?: false;
  forcedTableVersions?: undefined;
};

export type DryRunMigrateAllTablesOptions = {
  environment: string;
  dryRun: true;
  forcedTableVersions: TableVersionMap | undefined;
};

export type TableVersionMap = Record<string, number>;
