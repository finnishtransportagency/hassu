import {
  LataaProjektiQueryVariables,
  LisaaMuistutusMutationVariables,
  LisaaPalauteMutationVariables,
  ListaaLisaAineistoQueryVariables,
  ListaaProjektitQueryVariables,
  ValmisteleTiedostonLatausQueryVariables,
} from "../../../common/graphql/apiModel";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { apiConfig, OperationName } from "../../../common/abstractApi";
import { createUploadURLForFile } from "../handler/fileHandler";
import { lisaAineistoHandler } from "../handler/lisaAineistoHandler";
import { muistutusHandler } from "../muistutus/muistutusHandler";
import { AppSyncEventArguments } from "./common";
import { loadProjektiJulkinen } from "../projekti/projektiHandlerJulkinen";
import { projektiSearchService } from "../projektiSearch/projektiSearchService";
import { log } from "../logger";
import { palauteHandlerJulkinen } from "../palaute/palauteHandlerJulkinen";

export async function executePublicOperation(event: AppSyncResolverEvent<AppSyncEventArguments>): Promise<unknown> {
  if (apiConfig[event.info.fieldName as OperationName].isYllapitoOperation) {
    const error = new Error("Yritettiin kutsua ylläpidon operaatiota julkisesta apista");
    log.error(error);
    throw error;
  }
  switch (event.info.fieldName) {
    case apiConfig.listaaProjektitJulkinen.name:
      return projektiSearchService.searchJulkinen((event.arguments as ListaaProjektitQueryVariables).hakuehto);
    case apiConfig.lataaProjektiJulkinen.name:
      return loadProjektiJulkinen((event.arguments as LataaProjektiQueryVariables).oid);
    case apiConfig.valmisteleTiedostonLataus.name:
      return createUploadURLForFile(event.arguments as ValmisteleTiedostonLatausQueryVariables);
    case apiConfig.lisaaPalaute.name:
      return palauteHandlerJulkinen.lisaaPalaute(event.arguments as LisaaPalauteMutationVariables);
    case apiConfig.lisaaMuistutus.name:
      return muistutusHandler.kasitteleMuistutus(event.arguments as LisaaMuistutusMutationVariables);
    case apiConfig.listaaLisaAineisto.name:
      return lisaAineistoHandler.listaaLisaAineisto(event.arguments as ListaaLisaAineistoQueryVariables);
    default:
      return null;
  }
}
