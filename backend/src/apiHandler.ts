import { log } from "./logger";
import {
  LaskePaattymisPaivaQueryVariables,
  LataaAsiakirjaPDFQueryVariables,
  LataaProjektiQueryVariables,
  ListaaKayttajatQueryVariables,
  ListaaVelhoProjektitQueryVariables,
  TallennaProjektiInput,
  TallennaProjektiMutationVariables,
  ValmisteleTiedostonLatausQueryVariables,
} from "../../common/graphql/apiModel";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { listaaVelhoProjektit } from "./handler/listaaVelhoProjektit";
import { identifyUser } from "./user";
import { getCurrentUser } from "./handler/getCurrentUser";
import { listUsers } from "./handler/listUsers";
import { createOrUpdateProjekti, listProjektit, loadProjekti } from "./handler/projektiHandler";
import { apiConfig } from "../../common/abstractApi";
import { lataaAsiakirja } from "./handler/asiakirjaHandler";
import { createUploadURLForFile } from "./handler/fileHandler";
import * as AWSXRay from "aws-xray-sdk";
import { getCorrelationId, setupLambdaMonitoring, setupLambdaMonitoringMetaData } from "./aws/monitoring";
import { calculateEndDate } from "./endDateCalculator/endDateCalculatorHandler";

type AppSyncEventArguments =
  | unknown
  | LataaProjektiQueryVariables
  | ListaaVelhoProjektitQueryVariables
  | TallennaProjektiInput;

type LambdaResult = {
  data: any;
  correlationId: string;
};

async function executeOperation(event: AppSyncResolverEvent<AppSyncEventArguments>) {
  log.info(event.info.fieldName);
  switch (event.info.fieldName as any) {
    case apiConfig.listaaProjektit.name:
      return await listProjektit();
    case apiConfig.listaaVelhoProjektit.name:
      return await listaaVelhoProjektit(event.arguments as ListaaVelhoProjektitQueryVariables);
    case apiConfig.nykyinenKayttaja.name:
      return await getCurrentUser();
    case apiConfig.listaaKayttajat.name:
      return await listUsers((event.arguments as ListaaKayttajatQueryVariables).hakuehto);
    case apiConfig.lataaProjekti.name:
      return await loadProjekti((event.arguments as LataaProjektiQueryVariables).oid);
    case apiConfig.tallennaProjekti.name:
      return await createOrUpdateProjekti((event.arguments as TallennaProjektiMutationVariables).projekti);
    case apiConfig.lataaAsiakirjaPDF.name:
      return await lataaAsiakirja(event.arguments as LataaAsiakirjaPDFQueryVariables);
    case apiConfig.valmisteleTiedostonLataus.name:
      return await createUploadURLForFile((event.arguments as ValmisteleTiedostonLatausQueryVariables).tiedostoNimi);
    case apiConfig.laskePaattymisPaiva.name:
      return await calculateEndDate(event.arguments as LaskePaattymisPaivaQueryVariables);
    default:
      return null;
  }
}

export async function handleEvent(event: AppSyncResolverEvent<AppSyncEventArguments>): Promise<LambdaResult> {
  setupLambdaMonitoring();
  if (log.isLevelEnabled("debug")) {
    log.debug({ event });
  }

  return await AWSXRay.captureAsyncFunc("handler", async (subsegment) => {
    try {
      setupLambdaMonitoringMetaData(subsegment);

      try {
        await identifyUser(event);
        const data = await executeOperation(event);
        return { data, correlationId: getCorrelationId() } as LambdaResult;
      } catch (e: any) {
        log.error(e);
        e.message = JSON.stringify({
          message: e.message,
          correlationId: getCorrelationId(),
        });
        throw e;
      }
    } finally {
      if (subsegment) {
        subsegment.close();
      }
    }
  });
}
