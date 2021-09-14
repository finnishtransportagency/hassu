import log from "loglevel";
import { createSuunnitelma } from "./handler/createSuunnitelma";
import { CreateSuunnitelmaInput, UpdateSuunnitelmaInput } from "./api/apiModel";
import { listSuunnitelmat } from "./handler/listSuunnitelmat";
import { getSuunnitelmaById } from "./handler/getSuunnitelmaById";
import { updateSuunnitelma } from "./handler/updateSuunnitelma";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { getVelhoSuunnitelmaSuggestionsByName } from "./handler/getVelhoSuunnitelmaSuggestionsByName";
import { getVelhoSuunnitelmasByName } from "./handler/getVelhoSuunnitelmasByName";
import { identifyUser } from "./service/userService";
import { getCurrentUser } from "./handler/getCurrentUser";

const logLevel = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";
log.setLevel(logLevel as any);

type AppSyncEventArguments = {
  suunnitelma?: CreateSuunnitelmaInput | UpdateSuunnitelmaInput;
  suunnitelmaId?: string;
  suunnitelmaName?: string;
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
    case "getVelhoSuunnitelmaSuggestionsByName":
      return await getVelhoSuunnitelmaSuggestionsByName(event.arguments.suunnitelmaName);
    case "getVelhoSuunnitelmasByName":
      return await getVelhoSuunnitelmasByName(event.arguments.suunnitelmaName);
    case "getCurrentUser":
      return await getCurrentUser();
    default:
      return null;
  }
}
