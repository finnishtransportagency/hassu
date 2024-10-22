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
  ListaaHyvaksymisEsityksenTiedostotQueryVariables,
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
import { listaaHyvaksymisEsityksenTiedostot } from "../HyvaksymisEsitys/actions";

export async function executePublicOperation(event: AppSyncResolverEvent<unknown>): Promise<unknown> {
  if (apiConfig[event.info.fieldName as OperationName].isYllapitoOperation) {
    const error = new Error("Yritettiin kutsua ylläpidon operaatiota julkisesta apista");
    log.error(error);
    throw error;
  }
  switch (event.info.fieldName) {
    case apiConfig.listaaProjektitJulkinen.name:
      return await projektiSearchService.searchJulkinen((event.arguments as ListaaProjektitQueryVariables).hakuehto);
    case apiConfig.lataaProjektiJulkinen.name:
      return await loadProjektiJulkinen(event.arguments as LataaProjektiJulkinenQueryVariables);
    case apiConfig.valmisteleTiedostonLataus.name:
      return await createUploadURLForFile(event.arguments as ValmisteleTiedostonLatausQueryVariables);
    case apiConfig.lisaaPalaute.name:
      return await palauteHandlerJulkinen.lisaaPalaute(event.arguments as LisaaPalauteMutationVariables);
    case apiConfig.lisaaMuistutus.name:
      return await muistutusHandler.kasitteleMuistutus(event.arguments as LisaaMuistutusMutationVariables);
    case apiConfig.listaaLisaAineisto.name:
      return await lisaAineistoHandler.listaaLisaAineisto(event.arguments as ListaaLisaAineistoQueryVariables);
    case apiConfig.annaPalautettaPalvelusta.name:
      return await palautePalvelustaJulkinenHandler.lisaaPalautePalvelusta(event.arguments as AnnaPalautettaPalvelustaMutationVariables);
    case apiConfig.nykyinenSuomifiKayttaja.name:
      return await getSuomiFiKayttaja();
    case apiConfig.listaaLausuntoPyynnonTiedostot.name:
      return await tiedostoDownloadLinkHandler.listaaLausuntoPyynnonTiedostot(
        event.arguments as ListaaLausuntoPyynnonTiedostotQueryVariables
      );
    case apiConfig.listaaLausuntoPyynnonTaydennyksenTiedostot.name:
      return await tiedostoDownloadLinkHandler.listaaLausuntoPyynnonTaydennysTiedostot(
        event.arguments as ListaaLausuntoPyynnonTaydennyksenTiedostotQueryVariables
      );
    case apiConfig.listaaHyvaksymisEsityksenTiedostot.name:
      return await listaaHyvaksymisEsityksenTiedostot(event.arguments as ListaaHyvaksymisEsityksenTiedostotQueryVariables);
    default:
      return null;
  }
}
