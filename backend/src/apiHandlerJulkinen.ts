import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { commonHandleEvent, LambdaResult } from "./api/common";
import { executePublicOperation } from "./api/publicOperations";

export async function handleEvent(event: AppSyncResolverEvent<unknown>): Promise<LambdaResult> {
  return commonHandleEvent(event, executePublicOperation);
}
