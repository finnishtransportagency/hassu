import { AbstractApi, OperationConfig } from "../../../common/abstractApi";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { AppSyncEventArguments, handleEvent } from "../../src/apiHandler";

class API extends AbstractApi {
  async callAPI(operation: OperationConfig, variables?: unknown): Promise<unknown> {
    return (
      await handleEvent({
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
