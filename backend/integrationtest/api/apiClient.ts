import { AbstractApi, OperationConfig } from "../../../common/abstractApi";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { handleEvent } from "../../src/apiHandler";
import { handleEvent as publicHandleEvent } from "../../src/apiHandlerJulkinen";
import { AppSyncEventArguments } from "../../src/api/common";

class API extends AbstractApi {
  async callAPI(operation: OperationConfig, variables?: unknown): Promise<unknown> {
    return (
      await publicHandleEvent({
        info: { fieldName: operation.name },
        arguments: variables,
      } as AppSyncResolverEvent<AppSyncEventArguments>)
    ).data;
  }

  async callYllapitoAPI(operation: OperationConfig, variables?: unknown): Promise<unknown> {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const payload = {
      info: { fieldName: operation.name },
      arguments: variables,
    } as AppSyncResolverEvent<AppSyncEventArguments>;
    return (await handleEvent(payload)).data;
  }
}

export const api = new API();
