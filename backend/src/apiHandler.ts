import log from "loglevel";
import {
  LataaProjektiQueryVariables,
  ListaaVelhoProjektitQueryVariables,
  TallennaProjektiInput,
  TallennaProjektiMutationVariables,
} from "../../common/graphql/apiModel";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { listaaVelhoProjektit } from "./handler/listaaVelhoProjektit";
import { identifyUser } from "./service/userService";
import { getCurrentUser } from "./handler/getCurrentUser";
import { listAllUsers } from "./handler/listAllUsers";
import { listProjektit, loadProjekti, saveProjekti } from "./handler/projektiHandler";
import { apiConfig } from "../../common/abstractApi";

const logLevel = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";
log.setLevel(logLevel as any);

type AppSyncEventArguments =
  | {}
  | LataaProjektiQueryVariables
  | ListaaVelhoProjektitQueryVariables
  | TallennaProjektiInput;

export async function handleEvent(event: AppSyncResolverEvent<AppSyncEventArguments>) {
  log.info(JSON.stringify(event.info));

  await identifyUser(event.request?.headers);

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
      return await saveProjekti((event.arguments as TallennaProjektiMutationVariables).projekti);
    default:
      return null;
  }
}
