import { log } from "./logger";
import {
  ArkistoiProjektiMutationVariables,
  EsikatseleAsiakirjaPDFQueryVariables,
  HaeProjektiMuutoksetVelhostaQueryVariables,
  HaeVelhoProjektiAineistoLinkkiQueryVariables,
  LaskePaattymisPaivaQueryVariables,
  LataaProjektiQueryVariables,
  LisaaMuistutusMutationVariables,
  LisaaPalauteMutationVariables,
  ListaaKayttajatQueryVariables,
  ListaaLisaAineistoQueryVariables,
  ListaaPalautteetQueryVariables,
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
} from "./projekti/projektiHandler";
import { apiConfig } from "../../common/abstractApi";
import { lataaAsiakirja } from "./handler/asiakirjaHandler";
import { createUploadURLForFile } from "./handler/fileHandler";
import * as AWSXRay from "aws-xray-sdk-core";
import { getCorrelationId, setupLambdaMonitoring, setupLambdaMonitoringMetaData } from "./aws/monitoring";
import { calculateEndDate } from "./endDateCalculator/endDateCalculatorHandler";
import { listProjektit } from "./handler/listProjektitHandler";
import { velhoDocumentHandler } from "./handler/velhoDocumentHandler";
import { listKirjaamoOsoitteet } from "./kirjaamoOsoitteet/kirjaamoOsoitteetHandler";
import { palauteHandler } from "./palaute/palauteHandler";
import { ClientError } from "./error/ClientError";
import { SystemError } from "./error/SystemError";
import { tilaHandler } from "./handler/tila/tilaHandler";
import { lisaAineistoHandler } from "./handler/lisaAineistoHandler";
import { muistutusHandler } from "./muistutus/muistutusHandler";

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

async function executeOperation(event: AppSyncResolverEvent<AppSyncEventArguments>) {
  log.info(event.info.fieldName);
  switch (event.info.fieldName) {
    case apiConfig.listaaProjektit.name:
      return listProjektit((event.arguments as ListaaProjektitQueryVariables).hakuehto);
    case apiConfig.listaaVelhoProjektit.name:
      return listaaVelhoProjektit(event.arguments as ListaaVelhoProjektitQueryVariables);
    case apiConfig.listaaVelhoProjektiAineistot.name:
      return velhoDocumentHandler.listaaVelhoProjektiAineistot((event.arguments as ListaaVelhoProjektiAineistotQueryVariables).oid);
    case apiConfig.haeVelhoProjektiAineistoLinkki.name:
      return velhoDocumentHandler.haeVelhoProjektiAineistoLinkki(event.arguments as HaeVelhoProjektiAineistoLinkkiQueryVariables);
    case apiConfig.haeProjektiMuutoksetVelhosta.name:
      return findUpdatesFromVelho((event.arguments as HaeProjektiMuutoksetVelhostaQueryVariables).oid);
    case apiConfig.synkronoiProjektiMuutoksetVelhosta.name:
      return synchronizeUpdatesFromVelho((event.arguments as SynkronoiProjektiMuutoksetVelhostaMutationVariables).oid);

    case apiConfig.nykyinenKayttaja.name:
      return getCurrentUser();
    case apiConfig.listaaKayttajat.name:
      return listUsers((event.arguments as ListaaKayttajatQueryVariables).hakuehto);
    case apiConfig.lataaProjekti.name:
      return loadProjekti((event.arguments as LataaProjektiQueryVariables).oid);
    case apiConfig.tallennaProjekti.name:
      return createOrUpdateProjekti((event.arguments as TallennaProjektiMutationVariables).projekti);
    case apiConfig.esikatseleAsiakirjaPDF.name:
      return lataaAsiakirja(event.arguments as EsikatseleAsiakirjaPDFQueryVariables);
    case apiConfig.valmisteleTiedostonLataus.name:
      return createUploadURLForFile(event.arguments as ValmisteleTiedostonLatausQueryVariables);
    case apiConfig.laskePaattymisPaiva.name:
      return calculateEndDate(event.arguments as LaskePaattymisPaivaQueryVariables);
    case apiConfig.siirraTila.name:
      return tilaHandler.siirraTila((event.arguments as SiirraTilaMutationVariables).tilasiirtyma);
    case apiConfig.arkistoiProjekti.name:
      return arkistoiProjekti((event.arguments as ArkistoiProjektiMutationVariables).oid);
    case apiConfig.lisaaPalaute.name:
      return palauteHandler.lisaaPalaute(event.arguments as LisaaPalauteMutationVariables);
    case apiConfig.otaPalauteKasittelyyn.name:
      return palauteHandler.otaPalauteKasittelyyn(event.arguments as OtaPalauteKasittelyynMutationVariables);
    case apiConfig.listKirjaamoOsoitteet.name:
      return listKirjaamoOsoitteet();
    case apiConfig.lisaaMuistutus.name:
      return muistutusHandler.kasitteleMuistutus(event.arguments as LisaaMuistutusMutationVariables);
    case apiConfig.listaaLisaAineisto.name:
      return lisaAineistoHandler.listaaLisaAineisto(event.arguments as ListaaLisaAineistoQueryVariables);
    case apiConfig.listaaPalautteet.name:
      return palauteHandler.listaaPalautteet((event.arguments as ListaaPalautteetQueryVariables).oid);
    default:
      return null;
  }
}

export async function handleEvent(event: AppSyncResolverEvent<AppSyncEventArguments>): Promise<LambdaResult> {
  setupLambdaMonitoring();
  if (log.isLevelEnabled("debug")) {
    log.debug({ event });
  }

  return AWSXRay.captureAsyncFunc("handler", async (subsegment) => {
    try {
      setupLambdaMonitoringMetaData(subsegment);

      try {
        await identifyUser(event);
        const data = await executeOperation(event);
        const lambdaResult: LambdaResult = { data, correlationId: getCorrelationId() };
        return lambdaResult;
      } catch (e: unknown) {
        log.error(e);
        if (e instanceof Error) {
          // Only data that is sent out in case of error is the error message. We wish to log correlationId with the
          // error, so the only way to do it is to encode the data into error message field. The error field is decoded
          // in deployment/lib/template/response.vtl

          let errorType = "Error";
          let errorSubType: string;
          if (e instanceof ClientError) {
            errorType = "ClientError";
            errorSubType = e.className;
          } else if (e instanceof SystemError) {
            errorType = "SystemError";
            errorSubType = e.className;
          }

          e.message = JSON.stringify({
            message: e.message,
            correlationId: getCorrelationId(),
            errorType,
            errorSubType,
          });
        }
        throw e;
      }
    } finally {
      if (subsegment) {
        subsegment.close();
      }
    }
  });
}
