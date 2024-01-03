import { AbstractApi, OperationConfig } from "hassu-common/abstractApi";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { handleEvent } from "../../src/apiHandler";
import { handleEvent as publicHandleEvent } from "../../src/apiHandlerJulkinen";

class API extends AbstractApi {
  async callAPI(operation: OperationConfig, variables?: unknown): Promise<unknown> {
    return (
      await publicHandleEvent({
        info: { fieldName: operation.name },
        arguments: variables,
      } as AppSyncResolverEvent<unknown>)
    ).data;
  }

  async callYllapitoAPI(operation: OperationConfig, variables?: unknown): Promise<unknown> {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const payload = {
      info: { fieldName: operation.name },
      arguments: variables,
    } as AppSyncResolverEvent<unknown>;
    return (await handleEvent(payload)).data;
  }
}

export const api = new API();
