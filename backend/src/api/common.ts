import {
  LataaProjektiQueryVariables,
  ListaaVelhoProjektitQueryVariables,
  TallennaProjektiInput,
  TilaSiirtymaInput,
} from "../../../common/graphql/apiModel";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { getCorrelationId, setupLambdaMonitoring, setupLambdaMonitoringMetaData, wrapXRayAsync } from "../aws/monitoring";
import { log, setLogContextOid } from "../logger";
import { identifyUser } from "../user";
import { ClientError } from "../error/ClientError";
import { SystemError } from "../error/SystemError";
import { IllegalAineistoStateError } from "../error/IllegalAineistoStateError";
import { NotFoundError } from "../error/NotFoundError";
import { IllegalAccessError } from "../error/IllegalAccessError";

export type AppSyncEventArguments =
  | unknown
  | LataaProjektiQueryVariables
  | ListaaVelhoProjektitQueryVariables
  | TallennaProjektiInput
  | TilaSiirtymaInput;

export type LambdaResult = {
  data: unknown;
  correlationId: string;
};

export async function commonHandleEvent(
  event: AppSyncResolverEvent<AppSyncEventArguments>,
  executeOperation: (event: AppSyncResolverEvent<AppSyncEventArguments>) => Promise<unknown>
): Promise<LambdaResult> {
  setupLambdaMonitoring();
  if (log.isLevelEnabled("debug")) {
    log.debug({ event });
  }

  return wrapXRayAsync("handler", async (subsegment) => {
    setupLambdaMonitoringMetaData(subsegment);

    try {
      await identifyUser(event);
      const data = await executeOperation(event);
      const corId = getCorrelationId();
      const lambdaResult: LambdaResult = { data, correlationId: corId || "" };
      return lambdaResult;
    } catch (e: unknown) {
      if (e instanceof Error) {
        // Only data that is sent out in case of error is the error message. We wish to log correlationId with the
        // error, so the only way to do it is to encode the data into error message field. The error field is decoded
        // in deployment/lib/template/response.vtl

        let errorType = "Error";
        let errorSubType = "(no subtype)";
        if (
          e instanceof NotFoundError ||
          e instanceof IllegalAineistoStateError ||
          e instanceof IllegalAccessError ||
          e instanceof ClientError
        ) {
          errorType = "ClientError";
          errorSubType = e.className;
          log.error(e.message);
        } else if (e instanceof SystemError) {
          errorType = "SystemError";
          errorSubType = e.className;
          log.error(e);
        } else {
          log.error(e);
        }

        e.message = JSON.stringify({
          message: e.message,
          correlationId: getCorrelationId(),
          errorType,
          errorSubType,
        });
      }
      throw e;
    } finally {
      setLogContextOid(undefined);
    }
  });
}
