import { log } from "./logger";
import {
  ArkistoiProjektiMutationVariables,
  EsikatseleAsiakirjaPDFQueryVariables,
  HaeProjektiMuutoksetVelhostaQueryVariables,
  HaeVelhoProjektiAineistoLinkkiQueryVariables,
  LaskePaattymisPaivaQueryVariables,
  LataaProjektiQueryVariables,
  LisaaPalauteMutationVariables,
  ListaaKayttajatQueryVariables,
  ListaaProjektitQueryVariables,
  ListaaVelhoProjektiAineistotQueryVariables,
  ListaaVelhoProjektitQueryVariables,
  OtaPalauteKasittelyynMutationVariables,
  SiirraTilaMutationVariables,
  SynkronoiProjektiMuutoksetVelhostaMutationVariables,
  TallennaProjektiInput,
  TallennaProjektiMutationVariables,
  TilaSiirtymaInput,
  ValmisteleTiedostonLatausQueryVariables,
} from "../../common/graphql/apiModel";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { listaaVelhoProjektit } from "./handler/listaaVelhoProjektit";
import { identifyUser } from "./user";
import { getCurrentUser } from "./handler/getCurrentUser";
import { listUsers } from "./handler/listUsers";
import {
  arkistoiProjekti,
  createOrUpdateProjekti,
  findUpdatesFromVelho,
  loadProjekti,
  synchronizeUpdatesFromVelho,
} from "./handler/projektiHandler";
import { apiConfig } from "../../common/abstractApi";
import { lataaAsiakirja } from "./handler/asiakirjaHandler";
import { createUploadURLForFile } from "./handler/fileHandler";
import * as AWSXRay from "aws-xray-sdk-core";
import { getCorrelationId, setupLambdaMonitoring, setupLambdaMonitoringMetaData } from "./aws/monitoring";
import { calculateEndDate } from "./endDateCalculator/endDateCalculatorHandler";
import { aloitusKuulutusHandler } from "./handler/aloitusKuulutusHandler";
import { listProjektit } from "./handler/listProjektitHandler";
import { velhoDocumentHandler } from "./handler/velhoDocumentHandler";
import { palauteHandler } from "./palaute/palauteHandler";

type AppSyncEventArguments =
  | unknown
  | LataaProjektiQueryVariables
  | ListaaVelhoProjektitQueryVariables
  | TallennaProjektiInput
  | TilaSiirtymaInput;

type LambdaResult = {
  data: any;
  correlationId: string;
};

async function executeOperation(event: AppSyncResolverEvent<AppSyncEventArguments>) {
  log.info(event.info.fieldName);
  switch (event.info.fieldName as any) {
    case apiConfig.listaaProjektit.name:
      return await listProjektit((event.arguments as ListaaProjektitQueryVariables).hakuehto);
    case apiConfig.listaaVelhoProjektit.name:
      return await listaaVelhoProjektit(event.arguments as ListaaVelhoProjektitQueryVariables);
    case apiConfig.listaaVelhoProjektiAineistot.name:
      return await velhoDocumentHandler.listaaVelhoProjektiAineistot(
        (event.arguments as ListaaVelhoProjektiAineistotQueryVariables).oid
      );
    case apiConfig.haeVelhoProjektiAineistoLinkki.name:
      return await velhoDocumentHandler.haeVelhoProjektiAineistoLinkki(
        event.arguments as HaeVelhoProjektiAineistoLinkkiQueryVariables
      );
    case apiConfig.haeProjektiMuutoksetVelhosta.name:
      return await findUpdatesFromVelho((event.arguments as HaeProjektiMuutoksetVelhostaQueryVariables).oid);
    case apiConfig.synkronoiProjektiMuutoksetVelhosta.name:
      return await synchronizeUpdatesFromVelho(
        (event.arguments as SynkronoiProjektiMuutoksetVelhostaMutationVariables).oid
      );

    case apiConfig.nykyinenKayttaja.name:
      return await getCurrentUser();
    case apiConfig.listaaKayttajat.name:
      return await listUsers((event.arguments as ListaaKayttajatQueryVariables).hakuehto);
    case apiConfig.lataaProjekti.name:
      return await loadProjekti((event.arguments as LataaProjektiQueryVariables).oid);
    case apiConfig.tallennaProjekti.name:
      return await createOrUpdateProjekti((event.arguments as TallennaProjektiMutationVariables).projekti);
    case apiConfig.esikatseleAsiakirjaPDF.name:
      return await lataaAsiakirja(event.arguments as EsikatseleAsiakirjaPDFQueryVariables);
    case apiConfig.valmisteleTiedostonLataus.name:
      return await createUploadURLForFile((event.arguments as ValmisteleTiedostonLatausQueryVariables).tiedostoNimi);
    case apiConfig.laskePaattymisPaiva.name:
      return await calculateEndDate(event.arguments as LaskePaattymisPaivaQueryVariables);
    case apiConfig.siirraTila.name:
      return await aloitusKuulutusHandler.siirraTila((event.arguments as SiirraTilaMutationVariables).tilasiirtyma);
    case apiConfig.arkistoiProjekti.name:
      return await arkistoiProjekti((event.arguments as ArkistoiProjektiMutationVariables).oid);
    case apiConfig.lisaaPalaute.name:
      return await palauteHandler.lisaaPalaute(event.arguments as LisaaPalauteMutationVariables);
    case apiConfig.otaPalauteKasittelyyn.name:
      return await palauteHandler.otaPalauteKasittelyyn(event.arguments as OtaPalauteKasittelyynMutationVariables);
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
