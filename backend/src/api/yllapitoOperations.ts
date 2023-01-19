import { log } from "../logger";
import {
  ArkistoiProjektiMutationVariables,
  EsikatseleAsiakirjaPDFQueryVariables,
  HaeProjektiMuutoksetVelhostaQueryVariables,
  HaeVelhoProjektiAineistoLinkkiQueryVariables,
  LaskePaattymisPaivaQueryVariables,
  LataaProjektiQueryVariables,
  LisaaMuistutusMutationVariables,
  ListaaKayttajatQueryVariables,
  ListaaPalautteetQueryVariables,
  ListaaProjektitQueryVariables,
  ListaaVelhoProjektiAineistotQueryVariables,
  ListaaVelhoProjektitQueryVariables,
  OtaPalauteKasittelyynMutationVariables,
  PaivitaPerustietojaMutationVariables,
  PaivitaVuorovaikutustaMutationVariables,
  ProjektinTilaQueryVariables,
  SiirraTilaMutationVariables,
  SynkronoiProjektiMuutoksetVelhostaMutationVariables,
  TallennaProjektiMutationVariables,
} from "../../../common/graphql/apiModel";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { listaaVelhoProjektit } from "../handler/listaaVelhoProjektit";
import { getCurrentUser } from "../handler/getCurrentUser";
import { listUsers } from "../handler/listUsers";
import {
  arkistoiProjekti,
  createOrUpdateProjekti,
  findUpdatesFromVelho,
  loadProjekti,
  projektinTila,
  synchronizeUpdatesFromVelho,
  updatePerustiedot,
  updateVuorovaikutus,
} from "../projekti/projektiHandler";
import { apiConfig, OperationName } from "../../../common/abstractApi";
import { lataaAsiakirja } from "../handler/asiakirjaHandler";
import { calculateEndDate } from "../endDateCalculator/endDateCalculatorHandler";
import { listProjektit } from "../handler/listProjektitHandler";
import { velhoDocumentHandler } from "../handler/velhoDocumentHandler";
import { listKirjaamoOsoitteet } from "../kirjaamoOsoitteet/kirjaamoOsoitteetHandler";
import { palauteHandler } from "../palaute/palauteHandler";
import { tilaHandler } from "../handler/tila/tilaHandler";
import { muistutusHandler } from "../muistutus/muistutusHandler";
import { AppSyncEventArguments } from "./common";

export async function executeYllapitoOperation(event: AppSyncResolverEvent<AppSyncEventArguments>): Promise<unknown> {
  if (!apiConfig[event.info.fieldName as OperationName].isYllapitoOperation) {
    const error = new Error("Yritettiin kutsua julkista operaatiota ylläpidon apista");
    log.error(error);
    throw error;
  }
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
    case apiConfig.projektinTila.name:
      return projektinTila((event.arguments as ProjektinTilaQueryVariables).oid);
    case apiConfig.tallennaProjekti.name:
      return createOrUpdateProjekti((event.arguments as TallennaProjektiMutationVariables).projekti);
    case apiConfig.esikatseleAsiakirjaPDF.name:
      return lataaAsiakirja(event.arguments as EsikatseleAsiakirjaPDFQueryVariables);
    case apiConfig.laskePaattymisPaiva.name:
      return calculateEndDate(event.arguments as LaskePaattymisPaivaQueryVariables);
    case apiConfig.siirraTila.name:
      return tilaHandler.siirraTila((event.arguments as SiirraTilaMutationVariables).tilasiirtyma);
    case apiConfig.paivitaVuorovaikutusta.name:
      return updateVuorovaikutus((event.arguments as PaivitaVuorovaikutustaMutationVariables).input);
    case apiConfig.paivitaPerustietoja.name:
      return updatePerustiedot((event.arguments as PaivitaPerustietojaMutationVariables).input);
    case apiConfig.arkistoiProjekti.name:
      return arkistoiProjekti((event.arguments as ArkistoiProjektiMutationVariables).oid);
    case apiConfig.otaPalauteKasittelyyn.name:
      return palauteHandler.otaPalauteKasittelyyn(event.arguments as OtaPalauteKasittelyynMutationVariables);
    case apiConfig.listKirjaamoOsoitteet.name:
      return listKirjaamoOsoitteet();
    case apiConfig.lisaaMuistutus.name:
      return muistutusHandler.kasitteleMuistutus(event.arguments as LisaaMuistutusMutationVariables);
    case apiConfig.listaaPalautteet.name:
      return palauteHandler.listaaPalautteet((event.arguments as ListaaPalautteetQueryVariables).oid);
    default:
      return null;
  }
}
