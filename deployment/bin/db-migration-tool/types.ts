import { ScanCommandInput, UpdateCommandInput, ScanCommandOutput } from "@aws-sdk/lib-dynamodb";

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
  dryRun: boolean;
  environment: string;
};

export type PagedMigrationRunPlanResponse = {
  updateInput: UpdateCommandInput[];
  lastEvaluatedKey: ScanCommandOutput["LastEvaluatedKey"];
};
