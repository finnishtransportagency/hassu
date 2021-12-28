import log from "loglevel";
import {
  LataaKuulutusPDFQueryVariables,
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
import { listAllUsers } from "./handler/listAllUsers";
import { createOrUpdateProjekti, listProjektit, loadProjekti } from "./handler/projektiHandler";
import { apiConfig } from "../../common/abstractApi";
import { lataaKuulutus } from "./handler/kuulutusHandler";
import { createUploadURLForFile } from "./handler/fileHandler";
import { setupXRay, wrapXrayAsync } from "./aws/xray";

type AppSyncEventArguments =
  | {}
  | LataaProjektiQueryVariables
  | ListaaVelhoProjektitQueryVariables
  | TallennaProjektiInput;

export async function handleEvent(event: AppSyncResolverEvent<AppSyncEventArguments>) {
  if (log.getLevel() <= log.levels.DEBUG) {
    log.debug(JSON.stringify(event));
  }
  log.info(JSON.stringify(event.info));

  setupXRay();

  return await wrapXrayAsync("handler", async () => {
    try {
      await identifyUser(event);

      switch (event.info.fieldName as any) {
        case apiConfig.listaaProjektit.name:
          return await listProjektit();
        case apiConfig.listaaVelhoProjektit.name:
          return await listaaVelhoProjektit(event.arguments as ListaaVelhoProjektitQueryVariables);
        case apiConfig.nykyinenKayttaja.name:
          return await getCurrentUser();
        case apiConfig.listaaKayttajat.name:
          return await listAllUsers((event.arguments as ListaaKayttajatQueryVariables).hakuehto);
        case apiConfig.lataaProjekti.name:
          return await loadProjekti((event.arguments as LataaProjektiQueryVariables).oid);
        case apiConfig.tallennaProjekti.name:
          return await createOrUpdateProjekti((event.arguments as TallennaProjektiMutationVariables).projekti);
        case apiConfig.lataaKuulutusPDF.name:
          return await lataaKuulutus(event.arguments as LataaKuulutusPDFQueryVariables);
        case apiConfig.valmisteleTiedostonLataus.name:
          return await createUploadURLForFile(
            (event.arguments as ValmisteleTiedostonLatausQueryVariables).tiedostoNimi
          );
        default:
          return null;
      }
    } catch (e) {
      log.error(e);
      throw e;
    }
  });
}
