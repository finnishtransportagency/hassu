import log from "loglevel";
import { createSuunnitelma } from "./handler/createSuunnitelma";
import { CreateSuunnitelmaInput, UpdateSuunnitelmaInput } from "./api/apiModel";
import { listSuunnitelmat } from "./handler/listSuunnitelmat";
import { getSuunnitelmaById } from "./handler/getSuunnitelmaById";
import { updateSuunnitelma } from "./handler/updateSuunnitelma";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { getVelhoSuunnitelmasByName } from "./handler/getVelhoSuunnitelmasByName";
import { identifyUser } from "./service/userService";
import { getCurrentUser } from "./handler/getCurrentUser";
import { listAllUsers } from "./handler/listAllUsers";

const logLevel = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";
log.setLevel(logLevel as any);

type AppSyncEventArguments = {
  suunnitelma?: CreateSuunnitelmaInput | UpdateSuunnitelmaInput;
  suunnitelmaId?: string;
  suunnitelmaName?: string;
  requireExactMatch?: boolean;
};

export async function handleEvent(event: AppSyncResolverEvent<AppSyncEventArguments>) {
  log.info(JSON.stringify(event.info));
  await identifyUser(event.request?.headers);
  switch (event.info.fieldName) {
    case "createSuunnitelma":
      return await createSuunnitelma(event.arguments.suunnitelma as CreateSuunnitelmaInput);
    case "listSuunnitelmat":
      return await listSuunnitelmat();
    case "getSuunnitelmaById":
      return await getSuunnitelmaById(event.arguments.suunnitelmaId);
    case "updateSuunnitelma":
      return await updateSuunnitelma(event.arguments.suunnitelma as UpdateSuunnitelmaInput);
    case "getVelhoSuunnitelmasByName":
      return await getVelhoSuunnitelmasByName(event.arguments.suunnitelmaName, event.arguments.requireExactMatch);
    case "getCurrentUser":
      return await getCurrentUser();
    case "listAllUsers":
      return await listAllUsers();
    default:
      return null;
  }
}
