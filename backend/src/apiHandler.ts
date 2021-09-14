import { createSuunnitelma } from "./handler/createSuunnitelma";
import { CreateSuunnitelmaInput, UpdateSuunnitelmaInput } from "./api/API";
import { listSuunnitelmat } from "./handler/listSuunnitelmat";
import { getSuunnitelmaById } from "./handler/getSuunnitelmaById";
import { updateSuunnitelma } from "./handler/updateSuunnitelma";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { getVelhoSuunnitelmaSuggestionsByName } from "./handler/getVelhoSuunnitelmaSuggestionsByName";
import { getVelhoSuunnitelmasByName } from "./handler/getVelhoSuunnitelmasByName";

type AppSyncEventArguments = {
  suunnitelma?: CreateSuunnitelmaInput | UpdateSuunnitelmaInput;
  suunnitelmaId?: string;
  suunnitelmaName?: string;
};

export async function handleEvent(event: AppSyncResolverEvent<AppSyncEventArguments>) {
  // tslint:disable-next-line:no-console
  console.log(JSON.stringify(event));
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
    default:
      return null;
  }
}
