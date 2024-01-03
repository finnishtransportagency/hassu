import {
  AnnaPalautettaPalvelustaMutationVariables,
  LataaProjektiJulkinenQueryVariables,
  LisaaMuistutusMutationVariables,
  LisaaPalauteMutationVariables,
  ListaaLausuntoPyynnonTiedostotQueryVariables,
  ListaaLausuntoPyynnonTaydennyksenTiedostotQueryVariables,
  ListaaLisaAineistoQueryVariables,
  ListaaProjektitQueryVariables,
  ValmisteleTiedostonLatausQueryVariables,
} from "hassu-common/graphql/apiModel";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { apiConfig, OperationName } from "hassu-common/abstractApi";
import { createUploadURLForFile } from "../handler/fileHandler";
import { lisaAineistoHandler } from "../handler/lisaAineistoHandler";
import { muistutusHandler } from "../muistutus/muistutusHandler";
import { loadProjektiJulkinen } from "../projekti/projektiHandlerJulkinen";
import { projektiSearchService } from "../projektiSearch/projektiSearchService";
import { log } from "../logger";
import { palauteHandlerJulkinen } from "../palaute/palauteHandlerJulkinen";
import { palautePalvelustaJulkinenHandler } from "../palaute/palautePalvelustaJulkinenHandler";
import { getSuomiFiKayttaja } from "../user/userService";
import { tiedostoDownloadLinkHandler } from "../handler/tiedostoDownloadLinkHandler";

export async function executePublicOperation(event: AppSyncResolverEvent<unknown>): Promise<unknown> {
  if (apiConfig[event.info.fieldName as OperationName].isYllapitoOperation) {
    const error = new Error("Yritettiin kutsua ylläpidon operaatiota julkisesta apista");
    log.error(error);
    throw error;
  }
  switch (event.info.fieldName) {
    case apiConfig.listaaProjektitJulkinen.name:
      return projektiSearchService.searchJulkinen((event.arguments as ListaaProjektitQueryVariables).hakuehto);
    case apiConfig.lataaProjektiJulkinen.name:
      return loadProjektiJulkinen(event.arguments as LataaProjektiJulkinenQueryVariables);
    case apiConfig.valmisteleTiedostonLataus.name:
      return createUploadURLForFile(event.arguments as ValmisteleTiedostonLatausQueryVariables);
    case apiConfig.lisaaPalaute.name:
      return palauteHandlerJulkinen.lisaaPalaute(event.arguments as LisaaPalauteMutationVariables);
    case apiConfig.lisaaMuistutus.name:
      return muistutusHandler.kasitteleMuistutus(event.arguments as LisaaMuistutusMutationVariables);
    case apiConfig.listaaLisaAineisto.name:
      return lisaAineistoHandler.listaaLisaAineisto(event.arguments as ListaaLisaAineistoQueryVariables);
    case apiConfig.annaPalautettaPalvelusta.name:
      return palautePalvelustaJulkinenHandler.lisaaPalautePalvelusta(event.arguments as AnnaPalautettaPalvelustaMutationVariables);
    case apiConfig.nykyinenSuomifiKayttaja.name:
      return getSuomiFiKayttaja();
    case apiConfig.listaaLausuntoPyynnonTiedostot.name:
      return tiedostoDownloadLinkHandler.listaaLausuntoPyynnonTiedostot(event.arguments as ListaaLausuntoPyynnonTiedostotQueryVariables);
    case apiConfig.listaaLausuntoPyynnonTaydennyksenTiedostot.name:
      return tiedostoDownloadLinkHandler.listaaLausuntoPyynnonTaydennysTiedostot(
        event.arguments as ListaaLausuntoPyynnonTaydennyksenTiedostotQueryVariables
      );
    default:
      return null;
  }
}
