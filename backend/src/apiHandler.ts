import log from "loglevel";
import {
  LataaKuulutusPDFQueryVariables,
  LataaProjektiQueryVariables,
  ListaaVelhoProjektitQueryVariables,
  TallennaProjektiInput,
  TallennaProjektiMutationVariables,
  ValmisteleTiedostonLatausQueryVariables,
} from "../../common/graphql/apiModel";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { listaaVelhoProjektit } from "./handler/listaaVelhoProjektit";
import { identifyUser } from "./service/userService";
import { getCurrentUser } from "./handler/getCurrentUser";
import { listAllUsers } from "./handler/listAllUsers";
import { createOrUpdateProjekti, listProjektit, loadProjekti } from "./handler/projektiHandler";
import { apiConfig } from "../../common/abstractApi";
import { lataaKuulutus } from "./handler/kuulutusHandler";
import { createUploadURLForFile } from "./handler/fileHandler";

type AppSyncEventArguments =
  | {}
  | LataaProjektiQueryVariables
  | ListaaVelhoProjektitQueryVariables
  | TallennaProjektiInput;

export async function handleEvent(event: AppSyncResolverEvent<AppSyncEventArguments>) {
  log.info(JSON.stringify(event.info));

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
        return await listAllUsers();
      case apiConfig.lataaProjekti.name:
        return await loadProjekti((event.arguments as LataaProjektiQueryVariables).oid);
      case apiConfig.tallennaProjekti.name:
        return await createOrUpdateProjekti((event.arguments as TallennaProjektiMutationVariables).projekti);
      case apiConfig.lataaKuulutusPDF.name:
        return await lataaKuulutus(event.arguments as LataaKuulutusPDFQueryVariables);
      case apiConfig.valmisteleTiedostonLataus.name:
        return await createUploadURLForFile((event.arguments as ValmisteleTiedostonLatausQueryVariables).tiedostoNimi);
      default:
        return null;
    }
  } catch (e) {
    log.error(e);
    throw e;
  }
}
