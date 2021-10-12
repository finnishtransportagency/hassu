import * as apiHandler from "../../src/apiHandler";
import { AbstractApi, OperationConfig } from "../../../common/abstractApi";

class API extends AbstractApi {
  async callAPI(operation: OperationConfig, variables?: any): Promise<any> {
    return await apiHandler.handleEvent({
      info: { fieldName: operation.name },
      arguments: variables,
    } as any);
  }

  async callYllapitoAPI(operation: OperationConfig, variables?: any): Promise<any> {
    const payload = {
      info: { fieldName: operation.name },
      arguments: variables,
    } as any;
    return await apiHandler.handleEvent(payload);
  }
}

export const api = new API();
