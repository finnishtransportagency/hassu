import log from "loglevel";
import { LataaProjektiQueryVariables, ListaaVelhoProjektitQueryVariables, TallennaProjektiInput } from "./api/apiModel";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { listaaVelhoProjektit } from "./handler/listaaVelhoProjektit";
import { identifyUser } from "./service/userService";
import { getCurrentUser } from "./handler/getCurrentUser";
import { listAllUsers } from "./handler/listAllUsers";
import { listProjektit, loadProjekti, saveProjekti } from "./handler/projektiHandler";

const logLevel = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";
log.setLevel(logLevel as any);

type AppSyncEventArguments =
  | {}
  | LataaProjektiQueryVariables
  | ListaaVelhoProjektitQueryVariables
  | TallennaProjektiInput;

export enum Operation {
  "LISTAA_PROJEKTIT" = "LISTAA_PROJEKTIT",
  "LISTAA_VELHO_PROJEKTIT" = "LISTAA_VELHO_PROJEKTIT",
  "NYKYINEN_KAYTTAJA" = "NYKYINEN_KAYTTAJA",
  "LISTAA_KAYTTAJAT" = "LISTAA_KAYTTAJAT",
  "LATAA_PROJEKTI" = "LATAA_PROJEKTI",
  "TALLENNA_PROJEKTI" = "TALLENNA_PROJEKTI",
}

export async function handleEvent(event: AppSyncResolverEvent<AppSyncEventArguments>) {
  log.info(JSON.stringify(event.info));

  await identifyUser(event.request?.headers);

  const operation: Operation = event.info.fieldName as any;
  switch (operation) {
    case Operation.LISTAA_PROJEKTIT:
      return await listProjektit();
    case Operation.LISTAA_VELHO_PROJEKTIT:
      return await listaaVelhoProjektit(event.arguments as ListaaVelhoProjektitQueryVariables);
    case Operation.NYKYINEN_KAYTTAJA:
      return await getCurrentUser();
    case Operation.LISTAA_KAYTTAJAT:
      return await listAllUsers();
    case Operation.LATAA_PROJEKTI:
      return await loadProjekti((event.arguments as LataaProjektiQueryVariables).oid);
    case Operation.TALLENNA_PROJEKTI:
      return await saveProjekti(event.arguments as TallennaProjektiInput);
    default:
      return null;
  }
}
