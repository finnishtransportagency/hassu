import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { AppSyncEventArguments, commonHandleEvent, LambdaResult } from "./api/common";
import { executePublicOperation } from "./api/publicOperations";

export async function handleEvent(event: AppSyncResolverEvent<AppSyncEventArguments>): Promise<LambdaResult> {
  return commonHandleEvent(event, executePublicOperation);
}
