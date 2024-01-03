import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { commonHandleEvent, LambdaResult } from "./api/common";
import { executeYllapitoOperation } from "./api/yllapitoOperations";

export async function handleEvent(event: AppSyncResolverEvent<unknown>): Promise<LambdaResult> {
  return commonHandleEvent(event, executeYllapitoOperation);
}
